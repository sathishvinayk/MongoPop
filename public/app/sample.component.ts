import { Component, OnInit, Injectable, EventEmitter, Input, Output } from '@angular/core';
import { Response } from '@angular/http';
import { Observable, Subscription } from 'rxjs/Rx';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';

import { DataService } from './data.service';

@Component({
  selector: 'my-sample',
  templateUrl: 'app/sample.component.html',
  styleUrls: ['stylesheets/style.css']
})

@Injectable()
export class Samplecomponent implements OnInit {
  SampleDocResult: string = "";
  SampleDocError: string = "";

  // Parameters send down from parent component
  @Input() dataService: DataService;
  @Input() MongoDBCollectionName: string;

  //Event emitters to pass changes back up to parent component
  @Output() onSample = new EventEmitter<boolean>();
  @Output() onCollection = new EventEmitter<string>();

  ngOnInit(){ }

  syntaxHightlight(jsonObject: Object){
    var json: string;

    json = JSON.stringify(jsonObject, null, '\t');
    console.log("Created string " + json);
    return json;
  }

  // Invoked from component html code
  sampleDocs(CollName: string, NumberDocs: number){
    this.SampleDocResult = "";
    this.SampleDocError = "";
    this.onSample.emit(false);

    this.dataService.sendSampleDoc(CollName, NumberDocs)
    .subscribe(
      results => {
        // Invoked if/when the observable is succesfully resolved.
        if(results.success){
          this.SampleDocResult = this.syntaxHightlight(results.documents);
          this.MongoDBCollectionName = CollName;
          this.onSample.emit(true);
          this.onCollection.emit(this.MongoDBCollectionName);
        } else {
          this.SampleDocError = "Application Error: " + results.error;
        }
      },
      error => {
        this.SampleDocError = "Network Error: " + error.toString;
      }
    );
  }
}
