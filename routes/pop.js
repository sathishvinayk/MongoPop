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
})
