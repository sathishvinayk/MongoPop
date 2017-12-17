var getIP=require('external-ip')();
var request=require('request');
var express=require('express');
var router=express.Router();

var config=require('../config.js');
var DB=require('../javascripts/db');

var publicIP;  //Ip address of server running the mongopop service

getIP(function(err,ip){
  // Stores the ip add of server where mongopop service is running
  if(err){
    console.log("Failed to retrieve Ip address: "+err.message);
    throw err;
  }
  console.log("MongoPop API running on "+ip+ ": "+config.expressPort);
  publicIP=ip;
});

//This isn't part of api, but to check from browser or test it
router.get('/', function(req,res,next){
  var testObject={
    "AppName": "Mongopop",
    "version":1.0
  }
  res.json(testObject);
});

// Sends ip response with ip address
router.get('/ip', function(req,res,next){
  res.json({
    "ip": publicIP
  });
});

// Get config object
router.get('/config', function(req,res,next){
  res.json(config.client);
});

// Mockaroo to populate mongodb collection
function requestJSON(requestURL){
  //Retrive a json of example json from external source
  //E.g Mockaroo.com Returns a promise that either resolves to result
  //from json service or rejects with recieved error.
  return new Promise(function(resolve,reject){
    //Mockaroo can have problems with https- this is random sample data
    //So definition shouldn't need to be private
    finalDocURL=requestURL.replace('https', 'http');

    request({urL: finalDocURL, json:true}, function(error, res, body){
      if(error || res.statusCode != 200){
        console.log("Failed to fetch documents: "+ error.message);
        reject(error.message);
      }else {
        resolve(body);
      }
    })
  })
}

// Api addDocs
router.post('/addDocs',function(req,res,next){
  /* Request from client to add a number of docs to coll.
  //Request Should be in form
  {
    MongoDBURI: string; //Connect string
    collectionName: string;
    dataSource: string; //Mockaroo url to produce example docs
    numberDocs: number; //How many docs should be added
    unique: boolean; //Whether each batch of 1000 docs should be distinct
                    //from others
  }
  //Response will contain
  {
    success: boolean;
    count: number;  //How many docs were added
    error: string;
  }
  */
  var requestBody = req.body;
  var uniqueDocs=req.body.unique;
  var batchesCompleted = 0;
  var database = new DB;
  var docURL = requestBody.dataSource;

  database.connect(requestBody.MongoDBURI)
    .then(
      function(){
        if(uniqueDocs){
          // Need to fetch another batch of unique docs for each
          // batch of 1000 docs
          for(i=0; i < requestBody.nunberDocs; i++){
            requestJSON(docURL)
              .then(
                function(docs){
                  //The first function provided as a parameter to "then"
                  //is called if promise is resolved successfully. The
                  //"requestJSON" method returns the retrieved docs
                  //which the code in this function sees as "docs" parameter.
                  //Write these docs to db
                  database.popCollection(requestBody.collectionName, docs)
                    .then(
                      function(results){
                        return batchesCompleted++;
                      },
                      function(error){
                        //Error is set to error passed by popCollection
                        database.close();
                        resultObject={
                          "success": false,
                          "count": batchesCompleted,
                          "error": "Failed to write mock data: "+error
                        };
                        res.json(resultObject);
                        throw(false);
                      }
                    )
                    .then(
                      function(){
                        //IF all off the batches been successfully added
                        //then build and send the response
                        if(batchesCompleted==requestBody.numberDocs){
                          database.close();
                          console.log("Wrote all Mock data");
                          resultObject={
                            "success": true,
                            "count": batchesCompleted,
                            "error": ""
                          };
                          res.json(resultObject);
                        }
                      },
                      function(error){}
                    )
                },
                function(error){
                  database.close();
                  resultObject={
                    "success": false,
                    "count": batchesCompleted,
                    "error": "Failed to fetch mock data: "+error
                  };
                  res.json(resultObject);
                }
              )
          }
        }else {
          //Fetch one set of sample data & then use repeated batches of writes
          requestJSON(docURL)
          .then(
            function(docs){

              //Build an array of popCollection calls(not being executed at this point)
              var taskList=[];
              for(i=0; i< requestBody.numberDocs; i++){
                taskList.push(database.popCollection(requestBody.collectionName,docs))
              }
              //Promises.all executes all tasks in provided array Asynchronously
              //(i.e) Running in parallel
              var allPromise=Promise.all(taskList);
              allPromise
                .then(
                  function(result){
                    database.close();
                    resultObject={
                      "success": true,
                      "count": requestBody.numberDocs,
                      "error": ""
                    };
                    res.json(resultObject);
                  },
                  function(error){
                    database.close();
                    resultObject={
                      "success": false,
                      "count": 0, //If some writes succeded then real count may be >0
                      "error": "Failed to write data: "+error
                    };
                    res.json(resultObject);
                  }
                )
            },
            function(error){
              database.close();
              resultObject={
                "success": false,
                "count": 0,
                "error": "Failed to fetch mock data: "+error
              };
              res.json(resultObject);
            }
          )
        }
      },
      function(error){
        resultObject={
          "success": false,
          "count":0,
          "error": "Failed to connect to database: "+error
        };
        res.json(resultObject);
      }
    )
})

// Api SampleDOcs
router.post('/sampleDocs', function(req,res,next){
  /* Request from client to read a sample of docs from col.
  // req should be of form:
  {
    MongoDBURI: string; //Connect string for mongodB instance
    collectionName: string;
    numberDocs: number; //How many docs should be in result set
  }
  //Res should contain
  {
    success: boolean;
    documents: string //Sample of docuents from collection
    error: string;
  }
  */
  var requestBody = req.body;
  var database = new DB;

  database.connection(requestBody.MongoDBURI)
  .then(
    function(){
      // Returning will pass the promise returned by sampleColleciton to next
      ///.then in the chain
      return database.sampleCollection(requestBody.collectionName, requestBody.numberDocs)
    }
  ) //No funciton is provided to handle connection failing and so that
  //error will flow throught to next .then
  .then(
    function(docs){
      return {
        "success": true,
        "documents": docs,
        "error": ""
      };
    },
    function(error){
      console.log("Failed to retrieve sample data: "+error);
      return {
        "success": false,
        "documents": null,
        "error": "Failed to retrieve sample data: "+error
      };
    }
  )
  .then(
    function(resultObject){
      database.close();
      res.json(resultObject);
    }
  )
})

// Api CountDocs
router.post('/countDocs', function(req,res,next){
  /* request from client to count no of docs in coll,
  // Req should be of form
  {
    MongoDBURI: string; //Connect string for mongodB instance
    collectionName: string;
  }
  // Res should contain
  {
    success: boolean;
    count: number;    //No of docs in coll
    error: string
  }
  */
  var requestBody = req.body;
  var database = new DB;

  database.connect(requestBody.MongoURI)
  .then(
    function(){
      return database.countDocuments(requestBody.collectionName)
    }
  )
  .then(
    function(count){
      return {
        "success": true,
        "count": count,
        "error": ""
      };
    },
    function(err){
      console.log("Failed to count documents: "+err);
      return {
        "success": false,
        "count":0,
        "error": "Failed to count the documents: "+err;
      };
    }
  )
  .then(
    function(resultObject){
      database.close();
      res.json(resultObject);
    }
  )
})

// APi Update Docs
router.post('/updateDocs', funtion(req,res,next){
  /*Request from client to apply an update to all docs in collection
    which match a given pattern;
  //request should be of form as
  {
    MongoDBURI: string;
    collectionName: string;
    matchPattern: Object; //Filter to determine which documents should be updated
                          //(e.g) '{"gender": "male"}')

    dataChange: Object    //Change to be applied to each matching change
                          //(e.g) '{"$set": {"myComment": "this is a man"},
                          //"$inc": {"myCounter":1}}'
    threads: number;      //How many times to repeat(in parallel) the operation

  }
  //response will contain
  {
    success: boolean;
    count: number;      //no of docs updated(should be number of docs
                        matching the pattern multiplied by no of threads)
    error: string;
  }
  */
  var requestBody = req.body;
  var database = new DB;

  database.connect(requestBody.MongoURI)
  .then(
    function(){
      // Build up a list of operations to be performed
      var taskList = [];
      for(var i=0; i < requestBody.threads; i++){
        taskList.push(database.updateCollection(
          requestBody.collectionName,
          requestBody.matchPattern,
          requestBody.dataChange
        ));
      }
      // Asynchronously run all applications
      var allPromise = Promise.all(taskList);

      allPromise
      .then(
        function(values){
          documentsUpdated = values.reduce(add,0);
          return {
            "success": true,
            "count" : documentsUpdated,
            "error": {}
          };
        },
        function(error){
          console.log("Error updating documents: "+error);
          return {
            "success": false,
            "count": 0,
            "error": "Error updating documents: "+error
          };
        }
      )
      .then(
        function(resultObject){
          database.close();
          res.json(resultObject);
        }
      )
    },
    function(error){
      console.log("Failed to connect to db: "+error);
      resultObject={
        "success": false
        "count": 0,
        "error": "Failed to connect to database: "+error;
      };
      res.json(resultObject);
    }
  )
})

// Api AddDoc
router.post('/addDoc', function(req,res,next){
  /*Request from client to add a sample of doc from collection.
  //Request should be in form
  {
    collectionName: string;
    document: JSON document,
  }
  //Response will contain
  {
    success: boolean,
    error: string
  }
  */
  var requestBody = req.body;
  var database = new DB;

  database.connect(config.makerMongoDBURI)
  .then(
    function(){
      //Returning wil pass promise returned by addDoc to next .then in chain
      return database.addDocument(requestBody.collectionName, requestBody.document)
    }//No function is provided to handled connection failing so error will flow thru
    //next .then
  )
  .then(
    function(docs){
      return {
        "success": true,
        "error": ""
      };
    },
    function(error){
      console.log("Failed to add document: "+error);
      return {
        "success": false,
        "error": "Failed to add document: "+error
      }
    }
  )
  .then(
    function(resultObject){
      database.close();
      res.json(resultObject);
    }
  )
})

// Api Checkin
router.post('/checkIn', function(req,res,next){
  /* request from client to add a sample docs from a coll.
  // request form should be
  {
    venue,
    date,
    url,
    location
  }
  //Response should be
  {
    success: boolean,
    error: string
  }
  */
  var requestBody = req.body;
  var database = new DB;

  database.connect(config.makerMongoDBURI)
  .then(
    function(){
      var checkIn = {
        venueName: requestBody.venue,
        date: requestBody.date,
        url: requestBody.url,
        mapRef: requestBody.location
      }
      //Returning will pass the pronise returned by addDoc to
      //next .then in the chain
      return database.addDocument(config.checkInCollection, checkIn)
    }
  )
  .then(
    function(docs){
      return {
        "success": true,
        "error": ""
      };
    },
    function(error){
      console.log("Failed to add document: "+error);
      return {
        "success": false,
        "error": "Failed to add document: "+error
      };
    }
  )
  .then(
    function(resultObject){
      database.close();
      res.json(resultObject);
    }
  )
})

// API checkInCount
router.get('/checkInCount', function(req,res,next){
  /* Request from cline fo no of checkins
  //Response will contain
  {
  success: boolean,
  count: number,
  error: string
  }
  */
  var requestBody=req.body;
  var database = new DB;

  database.connect(config.makerMongoDBURI)
  .then(
    function(){
      return database.countDocuments(config.checkInCollection)
    }
  )
  .then(
    function(count){
      return {
        "success": true,
        "count" : count,
        "error": ""
      };
    },
    function(error){
      console.log("Failed to count checkins: "+error);
      return {
        "success": false,
        "count":0,
        "error": "Failed to count checkins: "+error
      };
    }
  )
  .then(
    function(resultObject){
      database.close();
      res.json(resultObject);
    }
  )
})

// Latest checkins
router.get('/latestCheckIn', function(req,res,next){
  /* Request from client for number of checkins
  //Response will contain
  {
    success: boolean,
    venue,
    date,
    url,
    location,
    error: string
  }
  */
  var requestBody=req.body;
  var database=new DB;

  database.connect(config.makerMongoDBURI)
  .then(
    function(){
      return database.mostRecentDocument(config.checkInCollection)
    }
  )
  .then(
    function(doc){
      return {
        "success": true,
        "venue": doc.venueName,
        "date": doc.date,
        "url": doc.url,
        "location": doc.mapRef,
        "error": ""
      };
    }
  )
  .then(
    function(resultObject){
      database.close();
      res.json(resultObject);
    }
  )
})

module.exports=router;
