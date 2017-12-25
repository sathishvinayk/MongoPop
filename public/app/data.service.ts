import {Injectable, OnInit} from '@angular/core';
import { Http, Response, RequestOptions, Headers } from '@angular/http';
import { Observable, Subscription } from 'rxjs/Rx';

import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';

import { MongoResult } from './MongoResult';
import { ClientConfig } from './ClientConfig';
import { AddDocsRequest } from './AddDocsRequest';
import { SampleDocsRequest } from './SampleDocsRequest';
import { MongoReadResult } from './MongoReadResult';
import { UpdateDocsRequest } from './UpdateDocsRequest';
import { CountDocsRequest } from './CountDocsRequest';

@Injectable()
export class DataService {
  private MongoDBURI: string;
  private baseURL: string = "http://localhost:3000/pop";

  constructor (private http: Http){

  }
  // fetchServerIP
  fetchServerIP(): Observable<string>{
    return this.http.get(this.baseURL + "ip")
      .map(response=>response.json().ip)
      .catch((error:any)=>Observable.throw(error.json().error || 'Server error'))
  }

  //fetchClientConfig
  fetchClientConfig(): Observable<ClientConfig> {
    return this.http.get(this.baseURL + "config")
    .map(response=>response.json())
    .catch((error:any)=>Observable.throw(error.json().error || 'Server error'))
  }
  // setMongoDBURI
  setMongoDBURI(MongoDBURI: string){
    this.MongoDBURI=MongoDBURI;
  }
  // calculateMongoDBURI
  calculateMongoDBURI(dbInputs: any): { "MongoDBURI": string, "MongoDBURIRedacted":string}
  {
    /*
      Returns uri for accessing db; if its for atlas use the password
      and use the chosen db name rather than 'admin'. Also returns the redacted URI
    */
    let MongoDBURI: string;
    let MongoDBURIRedacted: string;

    if(dbInputs.MongoDBBaseURI == 'mongodb://localhost:27017'){
      MongoDBURI = dbInputs.MongoDBBaseURI
        + "/" + dbInputs.MongoDBDatabaseName
        + "?authSource=admin&socketTimeoutMS="
        + dbInputs.MongoDBSocketTimeout*1000
        + "&maxPoolSize="
        + dbInputs.MongoDBConnectionPoolSize;
      MongoDBURIRedacted = dbInputs.MongoDBBaseURI;
    }else {
      dbInputs.MongoDBUser =dbInputs.MongoDBBaseURI.split('mongodb://')[1].split(':')[0];
      MongoDBURI = dbInputs.MongoDBBaseURI
        .replace('<DATABASE>', dbInputs.MongoDBDatabaseName)
        .replace('<PASSWORD', dbInputs.MongoDBUserPassword)
        + "&socketTimeoutMS="
        + dbInputs.MongoDBSocketTimeout*1000
        + "&maxPoolSize="
        + dbInputs.MongoDBConnectionPoolSize;
    }
    this.setMongoDBURI(MongoDBURI);
    return ({"MongoDBURI": MongoDBURI,
      "MongoDBURIRedacted": MongoDBURIRedacted
    });
  }

  //tryParseJSON
  tryParseJSON(jsonString: string): Object {
    /* Attempts to build an object from supplied string. Raises an error
    //if conversion failed
    */
    try {
      let myObject=JSON.parse(jsonString);
      if(myObject && typeof myObject === "object"){
        return myObject;
      }
    }
    catch(error){
      let errorString = "Not valid JSON: "+error.message;
      console.log(errorString);
      new Error(errorString);
    }
    return {};
  }

  // sendUpdateDocs
  sendUpdateDocs(doc: UpdateDocsRequest):Observable<MongoResult>{
    var headers = new Headers({'Content-Type': 'application/json'});
    var options = new RequestOptions({headers: headers});
    var url: string = this.baseURL + "updateDocs";

    return this.http.post(url, doc, options)
      .timeout(36000000, new Error('Timeout exceeded'))
      .map(response => response.json())
      .catch((error:any)=>{
        return Observable.throw(error.toString() || 'Server error')
      });
  };

  //UpdateDocs
  updateDBDocs(collName: string, matchPattern: string, dataChange: string,
        threads: number): Observable<MongoResult> {

    let matchObject: Object;
    let changeObject: Object;

    try {
      matchObject = this.tryParseJSON(matchPattern);
    }
    catch(error){
      let errorString = "Match pattern: "+error.message;
      console.log(errorString);
      return Observable.throw(errorString);
    }

    try {
      matchObject = this.tryParseJSON(dataChange);
    }
    catch(error){
      let errorString = "Data change: "+error.message;
      console.log(errorString);
      return Observable.throw(errorString);
    }

    let updateDocsRequest = new UpdateDocsRequest(this.MongoDBURI, collName, matchObject, changeObject, threads);
    return this.sendUpdateDocs(updateDocsRequest)
    .map(results=> {return results})
    .catch((error:any)=> {
      return Observable.throw(error.toString() || 'Server error')
    })
  }

  // SendCount Docs
  sendCountDocs(CollName: string): Observable<MongoResult> {
    /*Use Mongopop api to count no of docs in specified collection
    // It returns an Observable that delivers object of type MongoResult
    */
    //need to indicate request parameters will be in the performed
    //of json document
    var headers = new Headers({'Content-Type': 'application/json'});
    var options = new RequestOptions({headers: headers});

    var countDocsRequest = new CountDocsRequest(this.MongoDBURI, CollName);
    let url: string = this.baseURL+ "countDocs";

    return this.http.post(url, countDocsRequest, options)
    .timeout(360000, new Error('Timeout exceeded'))
    .map(response=>response.json())
    .catch((error:any)=>{
      return Observable.throw(error.toString() || 'Server error')
    });
  };
  // SendAdddoc Api
  sendAddDoc(CollName: string, DocURL: string, DocCount:number,
      Unique: boolean): Observable<MongoResult> {
    /*
      Docs are fetched from service such as Mockaroo using DocUrl
    */
    let headers = new Headers({'Content-Type': 'application/json'});
    let options = new RequestOptions({headers: headers});
    let addDocsRequest = new AddDocsRequest(this.MongoDBURI, CollName, DocURL, DocCount, Unique);
    let url: string = this.baseURL + "addDocs";

    return this.http.post(url, addDocsRequest, options)
    .timeout(3600000, new Error('Timeout exceeded'))
    .map(response=>response.json())
    .catch((error:any)=>{
      return Observable.throw(error.toString()||'server error')
    });
  };

  // SendSSampleDoc Api
  sendSampleDoc(CollName: string, NumberDocs: number): Observable<MongoReadResult>{
    /*
      Use Mongopop api to request a sample of docs from collection
    */
    let headers = new Headers({'Content-Type': 'application/json'});
    let options = new RequestOptions({headers: headers});
    let sampleDocsRequest = new SampleDocsRequest(this.MongoDBURI, CollName,NumberDocs);
    let url:string = this.baseURL + "sampleDocs";

    return this.http.post(url, sampleDocsRequest, options)
    .timeout(36000000, new Error('Timeout exceeded'))
    .map(response=>response.json())
    .catch((error:any)=>{
      return Observable.throw(error.toString() || 'Server error')
    });
  };
}
