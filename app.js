const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const https = require('https');
const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));

app.get('/', (req, res) => {
  res.sendFile(__dirname+"/secret.txt")
})

app.post('/', (req, res) => {
  const data = req.body.data;
  const jsondata = JSON.stringify(data);
  res.sendFile(__dirname+"/secret.txt")
    
  request.end();
});

app.listen(3000, () => {
  console.log(`Example app listening on port 3000`)
});
