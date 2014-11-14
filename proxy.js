var http = require('http');
var request = require('request');
var express = require('express');
var app = express();

app.get('/proxy', function(req, res) {
  var url = req.query.url;
  //console.log("proxy url: " + url);
  // var x = request(url);
  // req.pipe(x);
  // x.pipe(res);
  request(url)
  .on('response', function(proxyRes) {
    //console.log("proxy response status: " + proxyRes.statusCode);
    proxyRes.on('data', function(proxyData) {
      //console.log("proxy data:\n" + proxyData + "\n\n");
    });
  })
  .on('error', function(proxyErr) {
    console.error(proxyErr);
  })
  .pipe(res);
});
app.use('/', express.static('app'));

var server = app.listen(process.env.PORT || 9000, function(a) {
  console.log(a);
  console.log(server.address());
});
