
const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./datastore');
//const log = require('./login');
//const fetch = require('node-fetch');

var jwt = require('express-jwt');
var jwks = require('jwks-rsa');
//var request = require("request");

const datastore = ds.datastore;
const {fromDatastore} =require('./datastore');
const CAR = "Car";
const SPACE = "Space";

router.use(bodyParser.json());


/* ------------------Middleware- checkJwt------------------------*/

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
    issuer: `https://whited6.auth0.com/`,
    algorithms: ['RS256']
});



/* ------------------ Begin Model Functions ------------------*/

//       GET_total
//  -total number of cars
function get_total(req){
    var q = datastore.createQuery(CAR);
    const results = {};

    return datastore.runQuery(q).then( (entities) => {
        results.items = entities[0].map(fromDatastore);

        return results.items.length;
    });
}


//      GET Car
//  -Get individual car
function get_car(id){
    const key = datastore.key([CAR,parseInt(id,10)]);
    const q = datastore.createQuery(CAR).filter('__key__','=', key);
    return datastore.runQuery(q).then( (entities) =>{
        return entities[0].map(ds.fromDatastore);
    })
}


//      GET cars
//  -Get all cars
function get_cars(req){
    var q = datastore.createQuery(CAR).limit(5);
    const results = {};

    if(Object.keys(req.query).includes("cursor")){
        q = q.start(req.query.cursor);
    }
    return datastore.runQuery(q).then( (entities) => {
        results.items = entities[0].map(ds.fromDatastore);
        if(entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS ){
            results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + entities[1].endCursor;
        }
        return results;
    });
}

//      PUT cars
//  -Edit a car
function put_cars(id, body, old){

    var tag = body.tag;
    var type = body.type;
    var make = body.make;
    var model = body.model;
    var color = body.color;
    var owner = old.owner;
    var space = old.space;
    const key = datastore.key([CAR, parseInt(id,10)]);
    if(tag === undefined)
        tag = old.tag;
    if(type === undefined)
        type = old.type;
    if(make === undefined)
        make = old.make;
    if(model === undefined)
        model = old.model;
    if(color === undefined)
        color = old.color;
    if(space === undefined)
        space = old.space;
    const car = {"tag": tag, "type": type, "make": make, "model":model, "color":color, "owner":owner, "space":space };
    return datastore.update({"key":key, "data":car}).then(()=> {return key})
}



//      POST cars
//  -Create a car
function post_car(body){
    var key = datastore.key(CAR);
    const new_car = {"type":body.type,"make":body.make,"model":body.model,"color":body.color,"tag":body.tag,
        "owner":null,"space":null};
    return datastore.save({"key":key,"data": new_car})
        .then(()=>{return key});

}


//      Delete Space
//  -Deletes a Space
function delete_car(id){
    const key = datastore.key([CAR, parseInt(id,10)]);
    return datastore.delete(key);
}

/* ------------------ End Model Functions ------------------*/


/* ------------------ Begin Controller functions ------------*/


//      GET        /cars
router.get('/', function(req,res){
    return get_cars(req)
        .then(cars=>{
            for(var i=0;i<cars.items.length;i++){
                cars.items[i].self = req.protocol + "://" + req.get("host") + "/cars/" + cars.items[i].id;
            }
            const total = get_total(req)
                .then((total)=>{
                    cars.total = total;
                    const accepts = req.accepts(['application/json']);
                    if(!accepts){
                        res.status(406).send("Not acceptable");
                    }else if(accepts === 'application/json'){
                        res.status(200).json(cars);
                    }
                })


        }).catch(function(error){
            console.log(error)
        })
});


//      GET     /cars/{id}
router.get('/:id',function(req,res){
    const car = get_car(req.params.id)
        .then((car)=>{
            car[0].self=req.protocol+"://"+req.get("host")+"/cars/"+car[0].id;
            const accepts = req.accepts(['application/json']);
            if(!accepts){
                res.status(406).send("Not Acceptable")
            }else if(accepts === 'application/json'){
                res.status(200).json(car[0]);
            }
        })
});


//      POST        /cars
router.post('/', function(req, res){
    post_car(req.body)
        .then( key => {res.status(201).send('{ "self": "'+ req.protocol + '://'
            + req.get("host") + '/cars/' + key.id +'" }')} )

});


//      PUT         /cars/{id}
router.put('/:id', function(req,res){
    const old_car = get_car(req.params.id)
        .then((old_car)=>{
            put_cars(req.params.id,req.body, old_car[0])
                .then(key=> {res.status(303).location(req.protocol + "://" + req.get("host") + "/cars/" + key.id).end();
                }).catch(function(error){
                console.log(error);
            })

        })
});


//      DELETE      /cars/{id}
router.delete('/:id', function(req,res){
    delete_car(req.params.id).then(res.status(204).end())
        .catch(function(error){
            console.log(error)
        })

});

router.put('/',function(req,res){
    res.set('Accept','GET,POST');
    res.status(405).end();
});

router.delete('/', function(req,res){
    res.set('Accept','GET, POST');
    res.status(405).end();
});
/* ------------------ End Controller Functions ------------------*/




module.exports = router;
