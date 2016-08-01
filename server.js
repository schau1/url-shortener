/** @brief  FreeCodeCamp project
 * User Story: I can pass a URL as a parameter and I will receive a shortened URL in the JSON response.
 * User Story: If I pass an invalid URL that doesn't follow the valid http://www.example.com format, the JSON response will contain an error instead.
 * User Story: When I visit that shortened URL, it will redirect me to my original link.
 * 
 * Need to run mongo first: mongod --port 27017 --dbpath=./data --nojournal
 * 
*/

var express = require("express");
var path = require("path");
var url = require("url");
var mongo = require("mongodb").MongoClient;
var ObjectId = require('mongodb').ObjectID;
var dbUrl = process.env.MONGOLAB_URI || 'mongodb://localhost:27017/url-shortener';

var app = express();

app.use(express.static(path.join(__dirname, "public")));

function encode(num){
    var b = new Buffer(num);
    return b.toString('base64');
}

function decode(str){
    var b = new Buffer(str, 'base64');
    return b.toString();
}

// route all 'new/*'
app.get('/:url(*)', function(req,res){
    var json = {};
    
    if (req.url.match('/new/')){
        var original_url = req.url.substr('/new/'.length);
    
        var result = url.parse(original_url);
    
        if (result.protocol == null || result.slashes == false || result.hostname.split('.').length < 2){
            json.error = "Invalid URL format. Make sure you have the correct protocol and a valid address.";
            res.end(JSON.stringify(json));
        }
        else{
            processNew(original_url, req.headers.host, function(jsonItem){
                res.end(JSON.stringify(jsonItem));
            });
        }
    }
    else {
        var short_url = decode(req.url.substr('/'.length)); 

        if (short_url.length != 24){
            json.error = "This URL is not in the database.";
            res.end(JSON.stringify(json));            
        }
        else{
            redirect(short_url, function(err, data){
                if (err){
                    json.error = "This URL is not in the database.";
                    res.end(JSON.stringify(json));
                }
                
                console.log("Redirecting to " + data);
                res.redirect(data);
            });
        }
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
    var json = {};
    json.original_url = reqUrl;
    
    json.short_url = 'https://' + myHostname + '/';
    
    mongo.connect(dbUrl, function(err, db){
        if (err) throw err;
        
        var collection = db.collection('url');
        collection.find({original_url: json.original_url}).toArray(function(err, documents){
            if (err) throw err;
            
            if (documents.length > 0) {
                // URL is already in the database
                json.short_url += encode(documents[0]._id.toString());
                db.close();
                func(json);
            }
            else{
                // URL is not in database, add to database   
                collection.insert(json, function(err, data){
                    if (err) throw err;
                    
                    var item = {};
                    item.original_url = json.original_url;
                    
                    collection.find({original_url: json.original_url}).toArray(function(err, documents){
                        if (err) throw err;  
                        
                        item.short_url = 'https://' + myHostname + '/' + encode(documents[0]._id.toString());
                        db.close();
                        func(item);
                    });
                });  
            }
        });
    });
}

console.log("Request URL Shortener Microservice starting...");
app.listen(process.env.PORT || 8080);

