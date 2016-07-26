/** @brief  
*/

var express = require("express");
var app = express();

app.get('/', function(req,res){


    res.end('Hello World');
});

console.log("Request URL Shortener Microservice starting...")
app.listen(process.env.PORT || 8080);

