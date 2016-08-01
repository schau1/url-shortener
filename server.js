/** @brief  
 * 
 * Need to run mongo first: mongod --port 27017 --dbpath=./data --nojournal
 * 
*/

var express = require("express");
var path = require("path");
var url = require("url")
var mongo = require("mongodb").MongoClient;
var ObjectId = require('mongodb').ObjectID;
var dbUrl = process.env.MONGOLAB_URI || 'mongodb://localhost:27017/url-shortener';

var app = express();
var base = "123456789abcdefghiklmnopqrstvxyz";
var length = base.length;

/*
var b = new Buffer('1');
var s = b.toString('base64');
console.log(s + ' ' + b);
// SmF2YVNjcmlwdA==
var b = new Buffer('MQ', 'base64')
var s = b.toString();
// JavaScript
console.log(s + ' ' + b);*/

var item = encode(1564897832);
console.log(item);
var item2 = decode(item);
console.log(item2);


app.use(express.static(path.join(__dirname, "public")));


// https://www.mathsisfun.com/base-conversion-method.html
function encode(number){
    var result = '';
  
    while (num > length)  {
        var remainder = number % length;
        var num = Math.floor(number/length);      
        result = base[remainder].toString() + result;
    }

    return result;
}

function decode(number){
    var result = 0;
    
    while (number){
        var index = base.indexOf(number[0]);
        var power = number.length - 1;
        result += index * (Math.pow(base, power));
        number = number.substring(1);
    }
    
    return result;
}

// route all 'new/*'
app.get('/:url(*)', function(req,res){
    var json = {};
    
    if (req.url.match('/new/')){
        var original_url = req.url.substr('/new/'.length);
    
        var result = url.parse(original_url);
    
        if (result.protocol == null || result.slashes == false || result.hostname.split('.').length < 2){
            json.error = "Invalid URL format. Make sure you have the correct protocol and a valid address."
            res.end(JSON.stringify(json));
        }
        else{
            processNew(original_url, req.headers.host, function(jsonItem){
                res.end(JSON.stringify(jsonItem));
            });
        }
    }
    else {
        var short_url = req.url.substr('/'.length); 

        if (short_url.length != 24){
            json.error = "This URL is not in the database."
            res.end(JSON.stringify(json));            
        }
        
        redirect(short_url, function(err, data){
            if (err){
                json.error = "This URL is not in the database."
                res.end(JSON.stringify(json));
            }
            
            console.log("original_ur: " + data);
            res.redirect(data);
        });
    }
});



function redirect(short_url, func){
    console.log("short_url: ", short_url);
    
    mongo.connect(dbUrl, function(err, db){
        if (err) throw err;
        
        var collection = db.collection('url');
        collection.find({_id: ObjectId(short_url)}).toArray(function(err, documents){
            if (err) throw err;          

            if (documents.length > 0) {
                // valid URL
                func(0, documents[0].original_url);
            }
            else{
                // Invalid URL  
                func(1, null);
            }
        });
    });
}

function processNew(reqUrl, myHostname, func){
    var json = {}
    json.original_url = reqUrl;
    
    json.short_url = 'https://' + myHostname + '/';
    
    mongo.connect(dbUrl, function(err, db){
        if (err) throw err;
        
        var collection = db.collection('url');
        collection.find({original_url: json.original_url}).toArray(function(err, documents){
            if (err) throw err;
            
            if (documents.length > 0) {
                // URL is already in the database
                json.short_url += documents[0]._id;
                db.close();
                func(json);
            }
            else{
                // URL is not in database, add to database   
                collection.insert(json, function(err, data){
                    if (err) throw err;
                    
                    collection.find({original_url: json.original_url}).toArray(function(err, documents){
                        if (err) throw err;  
                        
                        json.short_url = 'https://' + myHostname + '/' + documents[0]._id;
                        db.close();
                        func(json);
                    });
                });  
            }
        });
    });
}


console.log("Request URL Shortener Microservice starting...")
app.listen(process.env.PORT || 8080);

