import { Component, OnInit, Injectable } from '@angular/core';
import { Observable, Subscription } from 'rxjs/Rx';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';

import { DataService } from './data.service';

@Component({
  selector: 'my-app',
  templateUrl: 'app/app.component.html',
  styleUrls: ['stylesheets/style.css']
})

// @Injectable means that dependencies can be implicitly added by including new objects
// in constructor parameter list
@Injectable()
export class AppComponent implements OnInit {
  serverIP: string="";
  MongoDBURIRedacted="";
  DataToPlayWith: boolean = false;
  dBInputs = {
    MongoDBBaseURI: "",
    MongoDBDatabaseName: "",
    MongoDBUser: "",
    MongoDBUserPassword: "",
    MongoDBSocketTimeout: 30,
    MongoDBConnectionPoolSize: 20
  };
  MongoDBCollectionName: string;
  defaultMockarooURI: string;

  dBURI = { MongoDBURI: "Not set yet", MongoDBURIRedacted: "Not set yet"};

  constructor(private dataService: DataService){ }

  ngOnInit(){
    // Find the Ip address of server hosting the mongopop api
    // Fetchserverip returns an Observable which we subscribe to and await results
    this.dataService.fetchServerIP().subscribe(
      results => {
        this.serverIP = results
      },
      error => {
        console.log("Failed to find an IP address; will use 127.0.0.1 instead. Reason "+error.toString);
      }
    );
    //Fetch default client config from backend
    this.dataService.fetchClientConfig().subscribe(
      results=>{
        this.dBInputs.MongoDBBaseURI = results.mongodb.defaultUri;
        this.dBInputs.MongoDBDatabaseName = results.mongodb.defaultDatabase;
        this.MongoDBCollectionName = results.mongodb.defaultCollection;
        this.defaultMockarooURI = results.mockarooUrl;
        // store the calculated Mongodb URI both in this object and
        //the dataService sub-object;
        this.dBURI = this.dataService.calculateMongoDBURI(this.dBInputs);
      },
      error =>{
        console.log("Failed to fetch client content data. Reason: "+error.toString);
      }
    )
  }
  // setMongoDBSocketTimeout
  setMongoDBSocketTimeout (timeout: number){
    this.dBInputs.MongoDBSocketTimeout = timeout;
    this.dBURI = this.dataService.calculateMongoDBURI(this.dBInputs);
  }
  // setMongodbConnectionPoolSize
  setMongodbConnectionPoolSize(poolSize: number){
    this.dBInputs.MongoDBConnectionPoolSize = poolSize;
    this.dBURI = this.dataService.calculateMongoDBURI(this.dBInputs);
  }
  // setBaseURI
  setBaseURI(uri:string){
    this.dBInputs.MongoDBBaseURI = uri;
    this.dBURI = this.dataService.calculateMongoDBURI(this.dBInputs);
  };
  // setDBName
  setDBName(dbName: string){
    this.dBInputs.MongoDBDatabaseName = dbName;
    this.dBURI = this.dataService.calculateMongoDBURI(this.dBInputs);
  }
  //setPassword
  setPassword(password: string){
    this.dBInputs.MongoDBUserPassword = password;
    this.dBURI = this.dataService.calculateMongoDBURI(this.dBInputs);
  }
  //showPassword
  showPassword(choice: boolean){
    if(choice){
      this.dBURI.MongoDBURIRedacted = this.dBURI.MongoDBURI;
    }else {
      this.dBURI = this.dataService.calculateMongoDBURI(this.dBInputs);
    }
  }
  // This is Invoked when sub-component (samplecomponent from sample.component.ts)
  // emits an onSample event. The binding is created in app.component.html
  onSample(haveSampleData: boolean){
    // Expose updatecomponent
    this.DataToPlayWith = haveSampleData;
  }
  // This is Invoked when sub-component emits an onCollection event to indicate
  // that the user has changes the collection within its form. THe binding is createed
  // in app.component.html
  onCollection(CollName: string){
    this.MongoDBCollectionName = CollName;
  }
}
