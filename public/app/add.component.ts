import { Component, OnInit, Injectable, EventEmitter, Input, Output } from '@angular/core';
import { Response } from '@angular/http';
import { Observable,  Subscription } from 'rxjs/Rx';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';

import { DataService } from './data.service';

@Component({
  selector: 'my-add',
  templateUrl: 'add/add.component.html',
  styleUrls: ['stylesheets/style.css']
})

@Injectable()
export class AddComponent implements OnInit {
  AddDocError: string = "";
  AddDocResult: string = "";
  docsToAdd: number = 1;

  // Parameters sent down from parent component(AppComponent)
  @Input() dataService: DataService;
  @Input() MongoDBCollectionName: string;
  @Input() MockarooURL: string;

  // Event emitters to pass changes back up to parent component;
  @Output() onCollection = new EventEmitter<string>();

  ngOnInit(){ }
  // Invoked from component's html code
  addDocs(CollName: string, DocURL: string, DocCount: number, Unique: boolean){
    this.AddDocResult = "";
    this.AddDocError = "";

    this.dataService.sendAddDoc(CollName, DocURL, DocCount, Unique)
      .subscribe(
        results=>{
          if(results.success){
            this.AddDocResult = 'Added '+ results.count + ',000 documents';
            this.MongoDBCollectionName = CollName;
            // Let the parent component know that collection name has changed
            this.onCollection.emit(this.MongoDBCollectionName);
          }else {
            this.AddDocError = "Application Error: " + results.error;
          }
        },
        error=>{
          this.AddDocError = "Network Error: "+error.toString;
        }
      )
  }
}
