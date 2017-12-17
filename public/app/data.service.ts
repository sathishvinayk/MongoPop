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
  fetchServerIP(): Observable<string>{
    return this.http.get(this.baseURL + "ip")
      .map(response=>response.json().ip)
      .catch((error:any)=>Observable.throw(error.json().error || 'Server error'))
  }

  fetchClientConfig(): Observable<ClientConfig> {
    return this.http.get(this.baseURL + "config")
    .map(response=>response.json())
    .catch((error:any)=>Observable.throw(error.json().error || 'Server error'))
  }
  setMongoDBURI(MongoDBURI: string){
    this.MongoDBURI=MongoDBURI;
  }
}
