const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const router = express.Router();
const ds = require('./datastore');
var jwt = require('express-jwt');
var jwks = require('jwks-rsa');

const datastore = ds.datastore;

const EMPLOYEE = "Employee";

router.use(bodyParser.json());

// Authentication middleware. When used, the
// Access Token must exist and be verified against
// the Auth0 JSON Web Key Set
const checkJwt = jwt({
    // Dynamically provide a signing key
    // based on the kid in the header and
    // the signing keys provided by the JWKS endpoint.
    secret: jwks.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://whited6.auth0.com/.well-known/jwks.json`
    }),

    // Validate the audience and the issuer.
    audience:'https://cs493-final.appspot.com',
    issuer: `https://whited6.auth0.com/`,
    algorithms: ['RS256']
});

/* ------------------ Begin Model Functions ------------------*/



/* ------------------ End Model Functions ------------------*/


/* ------------------ Begin Controller functions ------------*/

router.post('/',function(req, res){
    const username = req.body.username;
    const password = req.body.password;
    var options = { method: 'POST',
        url: 'https://whited6.auth0.com/oauth/token',
        headers: { 'content-type': 'application/json' },
        body:
            { scope: 'openid',
                grant_type: 'password',
                username: username,
                password: password,
                client_id: 'uR0gjEGks3LSUJQai2kZ8UN88Zd9n71O',
                client_secret: 'gartE0h4w0uLv9rBDmiH4NHD1N3eTigLf24Tu-7vxPJz2kMhl4Qi2BJdcya5Zxgm' },
        json: true };
    request(options, (error, response, body) => {
        if (error){
            res.status(500).send(error);
        } else {
            res.status(200).send(body);
        }
    });

});



/* ------------------ End Controller Functions ------------------*/



module.exports.jwt = jwt;
module.exports = router;