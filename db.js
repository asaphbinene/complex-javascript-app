let express = require('express');
let mongodb = require('mongodb');
let sanitizeHTML = require('sanitize-html'); 

let app = express();
let db;
let port = process.env.PORT
if(port == null || port == ""){
  port = 7329;
}
app.use(express.static('public'));
let connectionString = 'mongodb+srv://katbinUser01:myKatbinUser01@Mango@cluster0.cbcb8.mongodb.net/mykatbindb?retryWrites=true&w=majority';
mongodb.connect(connectionString, {useUnifiedTopology: true}, function(err, client){
    db = client.db();
    app.listen(port);
});
