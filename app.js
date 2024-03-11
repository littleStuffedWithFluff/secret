/*const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const https = require('https');
const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));

app.get('/', (req, res) => {
  console.log(req);
  console.log(res);
  res.sendFile(__dirname+"/secret.txt")
})

app.post('/', (req, res) => {
  const data = req.body;
  const oauth_code = req.body.code;
  console.log(oauth_code);
  writeFile('secret.txt', data, (err) => {if(err) throw err;});
  res.sendFile(__dirname+"/secret.txt");
    
  request.end();
});

app.listen(3000, () => {
  console.log(`Example app listening on port 3000`)
});*/


const express = require('express')

const app = express()
const port = 3030
const bodyParser = require('body-parser')
const oauthServer = require('./oauth/server.js')

const DebugControl = require('./utilities/debug.js')

//Here we are configuring express to use body-parser as middle-ware.
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(DebugControl.log.request())

app.use('/client', require('./routes/client.js')) // Client routes
app.use('/oauth', require('./routes/auth.js')) // routes to access the auth stuff
// Note that the next router uses middleware. That protects all routes within this middleware
app.use('/secure', (req,res,next) => {
  DebugControl.log.flow('Authentication')
  return next()
},oauthServer.authenticate(), require('./routes/secure.js')) // routes to access the protected stuff
app.use('/', (req,res) => res.redirect('/client'))


app.listen(port)
console.log("Oauth Server listening on port ", port)
