const express = require('express');
const app = express();

const json2html = require('node-json2html');

const Datastore = require('@google-cloud/datastore');
const bodyParser = require('body-parser');
const request = require('request');

const projectId = 'jwt-111218';
const datastore = new Datastore({projectId:projectId});

const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');

const SHIP = "Ship";

const router_ships = express.Router();
const login = express.Router();
const users = express.Router();

app.use(bodyParser.json());

function fromDatastore(item){
    item.id = item[Datastore.KEY].id;
    return item
}

// Authentication middleware. When used, the
// Access Token must exist and be verified against
// the Auth0 JSON Web Key Set
const checkJwt = jwt({
    // Dynamically provide a signing key
    // based on the kid in the header and
    // the signing keys provided by the JWKS endpoint.
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://whited6.auth0.com/.well-known/jwks.json`
    }),

    // Validate the audience and the issuer.
    issuer: `https://whited6.auth0.com/`,
    algorithms: ['RS256']
});

/* ------------- Begin Ship Model Functions ------------- */
/*************** Post_ship() *****************/
/* creates new ship                          */

function post_ship(name, type, length, owner){
    var key = datastore.key(SHIP);
	const new_ship = {"name": name, "type": type, "length": length, "owner": owner};
	return datastore.save({"key":key, "data":new_ship}).then(() => {return key})
}

/************* get_user_ships() ***************/
function get_user_ships(req, owner){
   var q = datastore.createQuery(SHIP).filter("owner",'=',owner).limit(6);
   const results = {};
    if(Object.keys(req.query).includes("cursor")){
        q=q.start(req.query.cursor);
    }
    return datastore.runQuery(q).then( (entities) =>{
        results.items = entities[0].map(fromDatastore);
        if(entities[1].moreResults !== Datastore.NO_MORE_RESULTS ){
            results.next = req.protocol + "://"+req.get("host")+req.baseUrl+"?cursor="+entities[1].endCursor;
        }
        return results;
    })
}

/************* get_ships() *******************/
/*  returns list of all ships                */
function get_ships(req){
    var q = datastore.createQuery(SHIP).limit(6);
    const results ={};
    if(Object.keys(req.query).includes("cursor")){
        q=q.start(req.query.cursor);
    }
    return datastore.runQuery(q).then( (entities) =>{
        results.items = entities[0].map(fromDatastore);
        if(entities[1].moreResults !== Datastore.NO_MORE_RESULTS ){
            results.next = req.protocol + "://"+req.get("host")+req.baseUrl+"?cursor="+entities[1].endCursor;
        }
        return results;
    })
}

/************* get_ship() *******************/
/*  returns individual ship                */

function get_ship(id){
    const key = datastore.key([SHIP,parseInt(id,10)]);
    const q = datastore.createQuery(SHIP).filter('__key__','=', key);
    return datastore.runQuery(q).then( (entities) =>{
        return entities[0].map(fromDatastore);
    })
}

/************* delete_ship() *******************/
function delete_ship(id){
    const s_key = datastore.key([SHIP,parseInt(id,10)]);
    return datastore.delete(s_key)
}

/* ------------- End Model Functions ------------- */




/* ------------- Begin Controller Functions ------------- */

/*************************************************************************/
/****************Ships****************************************************/
/*************************************************************************/

/* ------------- Get all ships --------------------------*/

router_ships.get('/', function(req, res){
    return get_ships(req)
        .then(ship_results =>{
            for(var i=0;i<ship_results.items.length;i++){
                ship_results.items[i].self = req.protocol + "://" + req.get("host") + "/ships/"
                    + ship_results.items[i].id;
            }
            const accepts = req.accepts(['application/json']);
            if(!accepts){
                res.status(406).send("Not acceptable");
            }else if(accepts === 'application/json'){
                res.status(200).json(ship_results);
            }

        }).catch(function(error){
            console.log(error)
        })
});


/* ------------- Get individual ship ------------------*/
router_ships.get('/:id',checkJwt, function(req, res){
    const ship = get_ship(req.params.id)
        .then( (ship) => {
            ship[0].self=req.protocol+"://"+req.get("host")+"/ships/"+ship[0].id;
            const  accepts = req.accepts(['application/json','text/html']);
            if(ship[0].owner && ship[0].owner !== req.user.name){
                res.status(403).send("Forbidden");
            }else if(!accepts){
                res.status(406).send('Not Acceptable');
            }else if(accepts === 'application/json'){
                res.status(200).json(ship);
            }else if(accepts ==='text/html') {
                var transform = {"<>":"ul","html":[
                        {"<>":"li","html":"ID: ${id}"},
                        {"<>":"li","html":"Name: ${name}"},
                        {"<>":"li","html":"Type: ${type}"},
                        {"<>":"li","html":"Length: ${length}"},
                        {"<>":"li","html":"Self: ${self}"}
                    ]};

                var data = [{"id":ship[0].id,
                    "name":ship[0].name,
                    "type":ship[0].type,
                    "length":ship[0].length,
                    "self":req.protocol+"://"+req.get("host")+"/ships/"+ship[0].id
                }];

                res.status(200).send(json2html.transform(data,transform));
            }
        }).catch(function(error){
            console.log(error)
        })
});


//add ship
/* ------------- Create ship ------------------*/
router_ships.post('/', checkJwt, function(req, res){
    post_ship(req.body.name, req.body.type, req.body.length, req.user.name)
    .then( key => {res.status(201).send('{ "self": "'+ req.protocol + '://'
        + req.get("host") + '/ships/' + key.id +'" }')} )

});


//de
/* ------------- Delete ship ------------------*/
router_ships.delete('/:id', checkJwt, function(req, res){
    const ship = get_ship(req.params.id).then((ship)=>{
       if(ship[0].owner && ship[0].owner !== req.user.name){
           res.status(403).send("Non-owner trying to delete ship.")
       }else{
           delete_ship(req.params.id).then(res.status(204).end())
       }
    }).catch(function(error){
        console.log(error)
    })

});

router_ships.delete('/', function(req,res){
    res.set('Accept','GET, POST');
    res.status(405).end()
});

router_ships.put('/', function(req,res){
    res.set('Accept','GET, POST');
    res.status(405).end()
});

//login
/*-------------Login-----------------------*/

login.post('/', function(req, res){
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
            res.send(body);
        }
    });

});

/*-----------------Users---------------------*/

users.get('/:id/ships',checkJwt, function(req,res) {
    if(req.user.name === req.params.id) {
        const ships = get_user_ships(req, req.user.name)
            .then((ships) => {
                for (var i = 0; i<ships.items.length; i++) {
                    ships.items[i].self = req.protocol + "://" + req.get("host") + "/ships/"
                        + ships.items[i].id
                }

                const accepts = req.accepts(['application/json']);
                if (!accepts) {
                    req.status(406).send("Not acceptable");
                }
                else if (accepts === 'application/json') {
                    res.status(200).json(ships);
                }
            }).catch(function (error) {
                console.log(error);
            })
    } else
        res.status(403).send("Forbidden");
});

/* ------------- End Controller Functions ------------- */
app.use('/ships', router_ships);
app.use('/login', login);
app.use('/users', users);


// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`)
});
