//Entry point
var express=require('express');
var path=require('path');
var favicon=require('serve-favicon');
var logger=require('morgan');
var bodyParser=require('body-parser');
var app=express();

var pop=require('./routes/pop');

// Makes generated html easier to read
app.locals.pretty=true;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Middlewares
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

//Static
app.use(express.static(path.join(__dirname, 'public')));

// Api
app.use('/pop', pop);

// 404
app.use(function(req,res,next){
  var err=new Error('Not found');
  err.status=404;
  next(err);
});

//Frame
if(app.use('env')==='development'){
  app.use(function(err,req,res,next){
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}
//Production erro hander
app.use(function(err,req,res,next){
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});
