const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const https = require('https');
const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));

app.get('/', (req, res) => {
  const oauth_code = req.body.data.code;
  console.log(oauth_code);
  res.sendFile(__dirname+"/secret.txt")
})

app.post('/', (req, res) => {
  const data = req.body.data;
  writeFile('secret.txt', data, (err) => {if(err) throw err;});
  res.sendFile(__dirname+"/secret.txt");
    
  request.end();
});

app.listen(3000, () => {
  console.log(`Example app listening on port 3000`)
});
