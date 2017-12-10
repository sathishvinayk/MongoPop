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