//MongoDB Nodejs driver
var MongoClient=require('mongodb').MongoClient;

function DB(){
  this.db=null; //Stores Db connection. Its initialised to null.
}

//Connnect function
DB.prototype.connect=function(uri){
  //Connect to db specified by connect string.

  //trick to cope with fact that this will refer to a different
  //obj once in promise's function.
  var _this=this;

  //This method returns a js promise
  return new Promise(function(resolve,reject){
    if(_this.db){
      //Already connected
      resolve();
    }else {
      var __this=_this;

      //Many methods in MongoDB driver will return promise.
      //If caller doesn't pass a cb function
      MongoClient.connect(uri)
      .then(
        function(database){
        //First function provided as paramerter to "then"
        //is called if promise is resolved. The "connect"
        //method returns new db connection which code in this function
        //sees as "database" parameter

        //store database connection as part of DB obj so that it can be
        //used for subsequent method calls
        __this.db=database;

        //Send back request got completed to caller. No parameters are passed back.
        resolve();
      },
        function(err){
          //If err or if promise is rejected. err is set to error passed by connect method
          console.log("Error Connecting: "+ err.message);
          //Send back request failed and pass back the error that was returned from "connect"
          reject(err.message);
      })
    }
  })
}

//Count the number of docs in collection
//Note collection method on db doesn't support promises, so cb is provided
DB.prototype.countDocuments=function(coll){
  //Returns a promise which resolves to no of docs in specified collection
  var _this=this;

  return new Promise(function(resolve,reject){
    //{strict: true}means count operation will fail if collection doesn't exist
    _this.db.collection(coll, {strict: true},function(error, collection){
      if(error){
        console.log("Could not access collection: "+error.message);
        reject(error.message);
      }else {
        collection.count()
        .then(
            function(count){
              //Resolve promise with count
              resolve(count);
            },
            function(err){
              console.log("countDocuments failed: "+err.message);
              //Reject with error
              reject(err.message);
          }
        )
      }
    });
  })
}
//Close the connection after counting the docs.
DB.prototype.close=function(){
  //Close db conn. If conn isn't open then just ignore.
  //If closing a conn fails then log the fact but then move on.
  //This method returns nothing, so caller can fire and forget

  if(this.db){
    this.db.close()
      .then(
        function(){},
        function(error){
          console.log("Failed to close Db: "+error.message);
      })
  }
}

//SampleCollection
DB.prototype.sampleCollection=function(coll,numberDocs){
  //Return promise which either resolved with array of numberDocs from coll collection
  //Or reject wit err
  var _this=this;
  return new Promise(resolve,reject){
    _this.db.collection(coll, {strict: true}, function(error, collection){
      if(error){
        console.log("Could not access colelction: "+error.message);
        reject(error.message);
      } else {
        //Create a cursor from aggregation result.
        var cursor=collection.aggregate([
          { $sample: {size: parseInt(numberDocs)}}],
          { cursor: {batchSize:10}}
        )
        //Iterate over cursor to access each doc.
        cursor.toArray(function(error,docArray){
          if(error){
            console.log("Error Reading From cursor: "+error.message);
            reject(error.message);
          }else {
            resolve(docArray);
          }
        })
      }
    })
  }
}

//update collection
DB.prototype.updateCollection=function(coll,pattern,update){
  //Return promise that either resolves (passing no of docs that have been updated)\
  //Or rejected with error
  //Pattern is used to match the required docs from the collection.
  //to which the "update" is applied
  var _this=this;
  return new Promise(function(resolve,reject){
    _this.db.collection(coll,{strict: true}, function(error,collection){
      if(error){
        console.log("Could not access collection: "+error.message);
        reject(error.message);
      }else {
        //Setting write concern to 1 ({w:1}) means that we dont wait for
        //changes to be replicated to any of secondaries.
        collection.updateMany(pattern, update, {w:1})
        .then(
          function(result){
            resolve(result.result.nModified);
          },
          function(err){
            console.log("UpdateMany Failed: "+err.message);
            reject(err.message);
          }
        )
      }
    })
  })
}
//PopCollection
DB.prototype.popCollection=function(coll,docs){
  //Takes the passed array of JSON docs and writes them to specified collection.
  //Returns promise that resolves with number of docs added or rejects with error
  var _this=this;
  return new Promise(function(resolve,reject){
    _this.db.collection(coll, {strict: false}, function(error,collection){
      if(error){
        console.log("Could not access collection: "+error.message);
        reject(error.message);
      }else {
        if(!Array.isArray(docs)){
          console.log("Data is not an array");

          //Reject promise with new error object
          reject({"message":"Data is not an array"})
        } else {
          //Insert the array of documents

          //InsertMany updates original array by adding _id's;
          //we dont want to change our original array so take a copy.
          //"JSON.parse" throws exception rather than returning an error
          //So we need to catch it.
          try {
            var _docs=JSON.parse(JSON.stringify(docs));
          } catch(trap){
            reject("Array elements are not valid JSON");
          }

          collection.insertMany(_docs)
          .then(function(results){
            resolve(results.insertedCount);
          },function(err){
            console.log("Failed to insert Docs: "+err.message);
            reject(err.message);
          })
        }
      }
    })
  })
}

//Add Document
DB.prototype.addDocument=function(coll,document){
  //Return promise that either resolves or rejects
  var _this=this;
  return new Promise(function(resolve,reject){
    _this.db.collection(coll, {strict: false}, function(error,collection){
      if(error){
        console.log("Could not access collection: "+error.message);
        reject(error.message);
      }else {
        collection.insert(document, {w: "majority"})
        .then(
          function(result){
            resolve();
          },
          function(err){
            console.log("Insert failed: "+err.message);
            reject(err.message);
          }
        )
      }
    })
  })
}

//MostRecentDocument
DB.prototype.mostRecentDocument=function(coll){
  //return promise that either resolves most recent document
  //from collection based on reverse sort on _id or reject
  var _this=this;
  return new Promise(function(resolve,reject){
    _this.db.collection(coll, {strict: false}, function(error,collection){
      if(error){
        console.log("Could not access collection: "+error.message);
        reject(error.message);
      }else {
        var cursor=collection.find({}).sort({_id:1}).limit(1);
        cursor.toArray(function(error,docArray){
          if(error){
            console.log("Error reading from cursor: "+error.message);
            reject(error.message);
          }else {
            resolve(docArray[0]);
          }
        })
      }
    })
  })
}

//Export it
module.exports=DB;
