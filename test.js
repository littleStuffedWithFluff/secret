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

module.exports = app // For testing





let chai = require('chai')
let should = require('chai').should()
let chaiHttp = require('chai-http')

chai.use(chaiHttp)

const {server} = require('../setup.js')

let validData = {
  code: '',
  tokenFrom: {
    code: '',
    refresh: '',
    refreshedRefresh: '',
  },
  refreshToken: '',
}

const userTypes = [
  {valid: true, type:'valid', username: 'username', password: 'password'},
  {valid: false, type:'invalid', username: 'user', password: 'pass'},
]

describe('/oauth', () => {
  const base = 'https://wakatime.com/oauth'
  describe('/', () => {
    const url = `${base}/authorize`
    describe('GET', () => {
      it('Should return a file', () => {
        return chai.request(server)
          .get(url)
          .then(res => res.status.should.equal(200))
      })
    })
    describe('POST', () => {
      userTypes.forEach(user => {
        it(`${user.type} user should${user.valid ? '' : ' not'} send a redirect to the proper location`, () => {
          return chai.request(server)
            .post(url)
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send({
              client_id: 'test_client_id',
              response_type: 'code',
              redirect_uri: 'https://littlestuffedwithfluff.github.io/secret',
              state: 'test_state',
              username: user.username,
              password: user.password,
            })
            .then(res => {
              res.status.should.equal(200)
              res.redirects.should.be.an('array')
              res.redirects.length.should.equal(1)
              const newLocation = res.redirects[0]

              if(user.valid) {
                const beginning = 'https://littlestuffedwithfluff.github.io/secret?code='
                newLocation.should.include(beginning)
                const expectedState = 'state=test_state'
                newLocation.should.include(expectedState)
                validData.code = newLocation.replace(beginning, '')
                validData.code.should.not.equal('')
              } else {
                newLocation.should.include('/oauth')
                newLocation.should.include('success=false')
              }
            })
        })
      })
    })
  })

  describe('/token', () => {
    const url = `${base}/token`
    describe('POST => authorization_code', () => {
      it('Should return an object with a valid token', () => {
        return chai.request(server)
          .post(url)
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send({
            client_id: 'test_client_id',
            client_secret: 'test_client_secret',
            grant_type: 'authorization_code',
            code: validData.code,
          })
          .then(res => {
            validData.tokenFrom.code = `${res.body.token_type} ${res.body.access_token}`
            validData.refreshToken = res.body.refresh_token
            res.should.have.status(200)
            res.body.should.have.own.property('expires_in')
            res.body.should.have.own.property('access_token')
            res.body.should.have.own.property('token_type')
            res.body.should.have.own.property('refresh_token')
            res.body.access_token.should.not.be.null
            res.body.token_type.should.equal('Bearer')
          })
      })
    })

    describe('POST => refresh_token', () => {
      it('Should return an object with a valid token', () => {
        return chai.request(server)
          .post(url)
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send({
            client_id: 'test_client_id',
            client_secret: 'test_client_secret',
            grant_type: 'refresh_token',
            refresh_token: validData.refreshToken,
          })
          .then(res => {
            validData.tokenFrom.refresh = `${res.body.token_type} ${res.body.access_token}`
            validData.refreshToken = res.body.refresh_token
            res.should.have.status(200)
            res.body.should.have.own.property('expires_in')
            res.body.should.have.own.property('access_token')
            res.body.should.have.own.property('token_type')
            res.body.should.have.own.property('refresh_token')
            res.body.access_token.should.not.be.null
            res.body.token_type.should.equal('Bearer')
          })
      })
    })

    describe('POST => refresh_token => refresh_token', () => {
      it('Should return an object with a valid token', () => {
        return chai.request(server)
          .post(url)
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send({
            client_id: 'test_client_id',
            client_secret: 'test_client_secret',
            grant_type: 'refresh_token',
            refresh_token: validData.refreshToken,
          })
          .then(res => {
            validData.tokenFrom.refreshedRefresh = `${res.body.token_type} ${res.body.access_token}`
            res.should.have.status(200)
            res.body.should.have.own.property('expires_in')
            res.body.should.have.own.property('access_token')
            res.body.should.have.own.property('token_type')
            res.body.should.have.own.property('refresh_token')
            res.body.access_token.should.not.be.null
            res.body.token_type.should.equal('Bearer')
          })
      })
    })
  })
})

describe('/secure Routes', () => {
  const base = '/secure'
  describe('GET', () => {
    it('Returns valid response with a token (Authorization Code)', () => {
      return chai.request(server)
        .get(base)
        .set('Authorization', validData.tokenFrom.code)
        .then(res => {
          res.should.have.status(200) // Unauthorized
          res.body.should.deep.equal({success: true})
        })
    })

    it('Returns valid response with a token (Refresh Token)', () => {
      return chai.request(server)
        .get(base)
        .set('Authorization', validData.tokenFrom.refresh)
        .then(res => {
          res.should.have.status(200) // Unauthorized
          res.body.should.deep.equal({success: true})
        })
    })

    it('Returns valid response with a token (Refreshed Refresh Token)', () => {
      return chai.request(server)
        .get(base)
        .set('Authorization', validData.tokenFrom.refreshedRefresh)
        .then(res => {
          res.should.have.status(200) // Unauthorized
          res.body.should.deep.equal({success: true})
        })
    })

    it('Returns an invalid response with a bad token', () => {
      return chai.request(server)
        .get(base)
        .set('Authorization', '')
        .then(res => {
          res.should.have.status(401) // Unauthorized
        })
    })
  })
})
