
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
const SPACE = "Space";
const CAR = "Car";
const RENTER ="Renter";
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
//  -total number of renters
function get_total(req){
    var q = datastore.createQuery(SPACE);
    const results = {};

    return datastore.runQuery(q).then( (entities) => {
        results.items = entities[0].map(fromDatastore);

        return results.items.length;
    });
}


//      GET Space
//  -Get individual space

function get_space(id){
    const key = datastore.key([SPACE,parseInt(id,10)]);
    const q = datastore.createQuery(SPACE).filter('__key__','=', key);
    return datastore.runQuery(q).then( (entities) =>{
        return entities[0].map(ds.fromDatastore);
    })
}


//      GET Spaces
//  -Get all spaces

function get_spaces(req){
    var q = datastore.createQuery(SPACE).limit(5);
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

//      PUT Spaces
//  -Edit a space
function put_spaces(id, body, old){

    var cost = body.cost;
    var size = body.size;
    var location = body.location;
    const key = datastore.key([SPACE, parseInt(id,10)]);
    if(cost === undefined)
        cost = old.cost;
    if(size === undefined)
        size = old.size;
    if(location === undefined)
        location = old.location;
    const space = {"cost": cost, "size": size, "location": location };
    return datastore.update({"key":key, "data":space}).then(()=> {return key})
}



//      POST Spaces
//  -Create a space
function post_space(body){
    var key = datastore.key(SPACE);
    const new_space = {"location":body.location,"size":body.size,"cost":body.cost};
    return datastore.save({"key":key,"data": new_space})
        .then(()=>{return key});

}


//      Delete Space
//  -Deletes a Space
function delete_space(id){
    const key = datastore.key([SPACE, parseInt(id,10)]);
    return datastore.delete(key);
}


//      GET cars
//  -Get all cars no pagination
function get_cars_np(){
    var q = datastore.createQuery(CAR);
    const results = {};

    return datastore.runQuery(q).then( (entities) => {
        results.items = entities[0].map(ds.fromDatastore);
        return results;
    });
}
//      GET space_car
//  -get the car in space
function get_space_car(all_cars,space_id){
    var car= null;
    for(var i=0;i<all_cars.length;i++){
        if (all_cars[i].space === space_id)
            car = all_cars[i];
    }
    return car;

}


//      GET renter
//  -Get individual renter
function get_renter(id){
    const key = datastore.key([RENTER,parseInt(id,10)]);
    const q = datastore.createQuery(RENTER).filter('__key__','=', key);
    return datastore.runQuery(q).then( (entities) =>{
        return entities[0].map(ds.fromDatastore);
    })
}

//      GET renters -no pagination
//  -Get all renters
function get_renters_np(){
    var q = datastore.createQuery(RENTER);
    const results = {};

    return datastore.runQuery(q).then( (entities) => {
        results.items = entities[0].map(ds.fromDatastore);

        return results;
    });
}

//      delete_space
//  -removes space from renter
function update_renter(renter,space){
    spaces=[];

    var first = renter.first;
    var last = renter.last;
    var phone = renter.phone;
    var username = renter.username;
    var u_id = renter.u_id;

    for(var i=0;i<renter.space.length;i++){
        if(renter.space[i].s_id !== space){
            spaces.push(renter.space[i]);
        }

    }
    console.log("renter:"+renter.id);
    const key = datastore.key([RENTER, parseInt(renter.id,10)]);
    const renter_update = {"first": first, "last": last, "phone": phone, "username": username, "u_id": u_id,
        "space":spaces};

    return datastore.update({"key":key, "data":renter_update}).then(()=> {return key})
}


//      PUT cars
//  -Edit a car
function update_car(id, old){

    var tag = old.tag;
    var type = old.type;
    var make = old.make;
    var model = old.model;
    var color = old.color;
    var owner = old.owner;
    var space = null;
    console.log("car:"+ old.id);
    const key = datastore.key([CAR, parseInt(old.id,10)]);

    const car = {"tag": tag, "type": type, "make": make, "model":model, "color":color, "owner":owner, "space":space };

    return datastore.update({"key":key, "data":car}).then(()=> {return key})
}


//      remove_space_car
//  -removes the space from the car entity
async function remove_space(renters, cars, space){
    //find car
    var car = null;
    for(var i=0;i<cars.length;i++){
        if(cars[i].space === space){
            car = cars[i];
        }
    }
    //find renter
    var renter = null;
    for(var i=0;i<renters.items.length;i++){
        if(renters.items[i].space.length > 0){
            for(var j=0; j< renters.items[i].space.length;j++){

                if(renters.items[i].space[j].s_id===space){
                    renter = renters.items[i];
                }
            }
        }
    }
    if(renter && car){
        var car_prom = await update_car(space,car);
        var renter_prom = await update_renter(renter,space);
        var delete_prom_a = await delete_space(space);
    }else{
        var delete_prom_b = await delete_space(space);
    }


   return(space);

}
/* ------------------ End Model Functions ------------------*/


/* ------------------ Begin Controller functions ------------*/



//      GET        /spaces
router.get('/', function(req,res){
    return get_spaces(req)
        .then(spaces=>{
            for(var i=0;i<spaces.items.length;i++){
                spaces.items[i].self = req.protocol + "://" + req.get("host") + "/spaces/" + spaces.items[i].id;
            }
            const total = get_total(req)
                .then((total)=>{
                    spaces.total = total;
                  const accepts = req.accepts(['application/json']);
                  if(!accepts){
                      res.status(406).send("Not acceptable");
                  }else if(accepts === 'application/json'){
                      res.status(200).json(spaces);
                  }
                })


        }).catch(function(error){
            console.log(error)
        })
});


//      GET     /spaces/{id}
router.get('/:id', function(req,res){
    const space = get_space(req.params.id)
        .then((space)=>{
            space[0].self=req.protocol+"://"+req.get("host")+"/spaces/"+space[0].id;
            const accepts = req.accepts(['application/json']);
            if(!accepts){
                res.status(406).send("Not Acceptable")
            }else if(accepts === 'application/json'){
                res.status(200).json(space[0]);
            }
        })
});


//      POST        /spaces
router.post('/', function(req, res){
    post_space(req.body)
        .then( key => {res.status(201).send('{ "self": "'+ req.protocol + '://'
            + req.get("host") + '/spaces/' + key.id +'" }')} )

});

//      PUT         /spaces/{id}
router.put('/:id', function(req,res){
    const old_space = get_space(req.params.id)
        .then((old_space)=>{
           put_spaces(req.params.id,req.body, old_space[0])
                    .then(key=> {res.status(303).location(req.protocol + "://" + req.get("host") + "/spaces/" + key.id).end();
                    }).catch(function(error){
                        console.log(error);
                        res.status(403).send("Forbidden");
                    })

        })
});


//      DELETE      /spaces/{id}

router.delete('/:id',  function(req,res){
   var space = req.params.id;

   var renters = get_renters_np();
   var cars = get_cars_np();
   Promise.all([renters,cars]).then(function(values){
       var all_renters=values[0];
       var all_cars=values[1].items;

       var space_del= remove_space(all_renters, all_cars, space)
           .then((space_del)=>{
               res.status(204).end()
           });

   }).catch(function(error){
       console.log(error);
       res.status(403).send("Forbidden")
   })
});

//      GET     /spaces/{s_id}/cars
// get the car in the space
router.get('/:id/cars',checkJwt, function(req,res){
   var space_id= req.params.id;

   var spaces = get_space(space_id);
   var cars = get_cars_np(req);

   Promise.all([spaces,cars]).then(function(values){
       var space_location=values[0][0].location;
       var all_cars = values[1].items;

       var car = get_space_car(all_cars,space_id);

       get_renter(car.owner)
           .then((renter)=>{
               if(renter[0].u_id && renter[0].u_id !== req.user.sub){
                   res.status(401).send("Unauthorized");
               }else {
                   car.location = space_location;
                   car.self = req.protocol + '://' + req.get("host") + '/cars/' + car.id;
                   car.owner_self = req.protocol + '://' + req.get("host") + '/renters/' + car.owner;
                   car.space_self = req.protocol + '://' + req.get("host") + '/spaces/' + car.space;
                   res.status(200).send(car);
               }
           }).catch(function(error){
           res.status(403).send("Forbidden")
       })


   }).catch(function(error){
       res.status(403).send("Forbidden")
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
