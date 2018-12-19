
const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./datastore');
//const log = require('./login');
const fetch = require('node-fetch');

var jwt = require('express-jwt');
var jwks = require('jwks-rsa');
var request = require("request");


const datastore = ds.datastore;
const {fromDatastore} =require('./datastore');
const RENTER = "Renter";
const SPACE = "Space";
const CAR = "Car";

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
//      GET_spaces
//  -get all spaces no pagination
function get_spaces(req){
    var q = datastore.createQuery(SPACE);
    const results = {};

    return datastore.runQuery(q).then( (entities) => {
        results.items = entities[0].map(ds.fromDatastore);

        return results;
    });
}

//       GET_total
//  -total number of renters
function get_total(req){
    var q = datastore.createQuery(RENTER);
    const results = {};

    return datastore.runQuery(q).then( (entities) => {
        results.items = entities[0].map(fromDatastore);

        return results.items.length;
    });
}


//      Check_spaces
//  -checks if space is occupied
function check_spaces(renters, s_id){
    var found = false;
    for(var i=0;i<renters.items.length;i++)
        if(renters.items[i].space.length>0){

            for(var j=0;j<renters.items[i].space.length;j++){
                if (renters.items[i].space[j].s_id===s_id){
                    found = true;
                }
            }
        }
    return found;
}


//      Add_Space
//  -adds space to renter
function add_space(r_id,s_id,old){
    var first = old.first;
    var last = old.last;
    var phone = old.phone;
    var username = old.username;
    var u_id = old.u_id;
    var space = old.space;
    const key = datastore.key([RENTER, parseInt(r_id,10)]);
    space.push ({"s_id":s_id});
    const renter = {"first": first, "last": last, "phone": phone, "username": username, "u_id": u_id, "space":space};
    return datastore.update({"key":key, "data":renter}).then(()=> {return key})

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

//      GET renters
//  -Get all renters
function get_renters(req){
    var q = datastore.createQuery(RENTER).limit(5);
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


//      PUT Renters
//  -Edit a renter
function put_renter(id, body, old){
    var first = body.first;
    var last = body.last;
    var phone = body.phone;
    var username = old.username;
    var u_id = old.u_id;
    var space = old.space;
    const key = datastore.key([RENTER, parseInt(id,10)]);
    if(first === undefined)
        first = old.first;
    if(last === undefined)
        last = old.last;
    if(phone === undefined)
        phone = old.phone;
    const renter = {"first": first, "last": last, "phone": phone, "username": username, "u_id": u_id, "space":space};
    return datastore.update({"key":key, "data":renter}).then(()=> {return key})
}

//      create_login
//  -creates the authO account for the renter
function create_login(token, name, email, username, password){
    var b_token = 'Bearer '+token;
    var body = "connection=Username-Password-Authentication&email="+email+"&username="+username+"&password="+password+"&name="+name;
    return fetch("https://whited6.auth0.com/api/v2/users",{
        method:"POST",
        mode:"cors",
        headers:{
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": b_token,
        },
        body: body,
    })
        .then(response=>response.json());
}

//      POST Renters
//  -Create a user
function post_renters(id, req){
    var key = datastore.key(RENTER);
    const new_renter = {"u_id":id,"first":req.body.first,"last":req.body.last,"phone":req.body.phone,
        "username":req.body.username, "space":[]};
    return datastore.save({"key":key,"data": new_renter})
        .then(()=>{return key});

}


//      Delete Login
//  -Deletes the login
function delete_login(token, id){
    var b_token = 'Bearer '+token;
    var options = { method: 'DELETE',
        url: 'https://whited6.auth0.com/api/v2/users/'+id,
        headers: {  'content-type': 'application/json',
                    'Authorization':b_token
        }
    };

    request(options, function (error, response, body) {
        if (error)
            throw new Error(error);
        console.log(body);
        return body;
    })
}


//      Delete Renter
//  -Deletes a user
function delete_renters(id){
    const key = datastore.key([RENTER, parseInt(id,10)]);
    return datastore.delete(key);
}


//      add_self
//  -add self to renter
function renters_self(req,renters){
    for(var i=0;i<renters.items.length;i++){
        renters.items[i].self = req.protocol + "://"+ req.get("host")+"/renters/"
            +renters.items[i].id;
        if(renters.items[i].space.length > 0){
            for(var j=0;j<renters.items[i].space.length;j++){
                renters.items[i].space[j].self = req.protocol + "://"+ req.get("host")+"/spaces/"
                    +renters.items[i].space[j].s_id;

            }
        }
    }

}

//      delete_space
//  -removes space from renter
function delete_space(renter,space){
    spaces=[];

    var first = renter.first;
    var last = renter.last;
    var phone = renter.phone;
    var username = renter.username;
    var u_id = renter.u_id;

    for(var i=0;i<renter.space.length;i++){
        if(renter.space[i].s_id !== space)
            spaces.push(renter.space[i]);
    }
    const key = datastore.key([RENTER, parseInt(renter.id,10)]);
    const renter_update = {"first": first, "last": last, "phone": phone, "username": username, "u_id": u_id,
        "space":spaces};
    return datastore.update({"key":key, "data":renter_update}).then(()=> {return key})
}


//      get_renter_spaces
//  -gets the renters spaces
function get_renter_spaces(req){
    var renter = get_renter(req.params.r_id);
    var spaces = get_spaces(req);
    var renter_spaces = [];
    return Promise.all([renter,spaces]).then(function(values){
        renter = values[0][0];
        spaces = values[1].items;

        if(renter.space.length > 0){
            for(var i=0; i< renter.space.length;i++){
                for(var j=0; j<spaces.length;j++) {
                    if (renter.space[i].s_id === spaces[j].id) {
                        renter_spaces.push(spaces[j]);
                    }
                }
            }
        }
        for(var i=0;i< renter_spaces.length;i++){
            renter_spaces[i].self = req.protocol + "://"+ req.get("host")+"/spaces/"
                +renter_spaces[i].id;
        }
        return renter_spaces;
    })
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

//      GET Car
//  -Get individual car
function get_car(id){
    const key = datastore.key([CAR,parseInt(id,10)]);
    const q = datastore.createQuery(CAR).filter('__key__','=', key);
    return datastore.runQuery(q).then( (entities) =>{
        return entities[0].map(ds.fromDatastore);
    })
}


//      POST car2renter
//  -adds renter id to car
function post_car2renter(car,renter_id){
    var tag = car.tag;
    var type = car.type;
    var make = car.make;
    var model = car.model;
    var color = car.color;
    var owner = renter_id;
    var space = car.space;
    const key = datastore.key([CAR, parseInt(car.id,10)]);

    const car_data = {"tag": tag, "type": type, "make": make, "model":model, "color":color, "owner":owner,"space":space };
    return datastore.update({"key":key, "data":car_data}).then(()=> {return key})
}


//      DELETE car from renter
//  -deletes renter id to car removes car from space
function delete_car_from_renter(car){
    var tag = car.tag;
    var type = car.type;
    var make = car.make;
    var model = car.model;
    var color = car.color;
    var owner = null;
    var space = null;
    const key = datastore.key([CAR, parseInt(car.id,10)]);

    const car_data = {"tag": tag, "type": type, "make": make, "model":model, "color":color, "owner":owner, "space":space };
    return datastore.update({"key":key, "data":car_data}).then(()=> {return key})
}

//      GET_renters_cars
//  -gets the renter's cars
function get_renters_cars(req,renter, cars){
    var renters_cars=[];

    for(var i=0;i<cars.items.length;i++){
        if(cars.items[i].owner === renter){
            renters_cars.push(cars.items[i]);
        }
    }

    for(var i=0;i<renters_cars.length;i++){
        renters_cars[i].self = req.protocol+"://"+req.get("host")+"/cars/"+renters_cars[i].id;
    }
    renters_cars.push( { 'owner_self': req.protocol+"://"+req.get("host")+"/renters/"+renter });
    return renters_cars;

}

//      GET cars_np
//  -Get all cars no pagination
function get_cars_np(req){
    var q = datastore.createQuery(CAR);
    const results = {};

    return datastore.runQuery(q).then( (entities) => {
        results.items = entities[0].map(ds.fromDatastore);
        return results;
    });
}

//      checkForSpace
//  -checks if space_id is in renter_space
function checkForSpace(space_id, renter_space){
    var found = false;
     for(var i=0;i<renter_space.length;i++){
        if(space_id === renter_space[0].s_id){
            found = true;
        }
    }
    return found;
}


//      POST car2space
//  -adds car to space
function post_car2space(req,car,space_id){
    var tag = car.tag;
    var type = car.type;
    var make = car.make;
    var model = car.model;
    var color = car.color;
    var owner = car.owner;
    var space = space_id;
    const key = datastore.key([CAR, parseInt(car.id,10)]);

    const car_data = {"tag": tag, "type": type, "make": make, "model":model, "color":color, "owner":owner, "space":space };
    return datastore.update({"key":key, "data":car_data}).then(()=> {return key})
}

//      Delete car_from_space
//  -deletes car from renter's space
function delete_car_from_space(req,car,space_id){
    var tag = car.tag;
    var type = car.type;
    var make = car.make;
    var model = car.model;
    var color = car.color;
    var owner = car.owner;
    var space = null;
    const key = datastore.key([CAR, parseInt(car.id,10)]);

    const car_data = {"tag": tag, "type": type, "make": make, "model":model, "color":color, "owner":owner, "space":space };
    return datastore.update({"key":key, "data":car_data}).then(()=> {return key})
}

/* ------------------ End Model Functions ------------------*/


/* ------------------ Begin Controller functions ------------*/

//      GET        /renters
router.get('/', function(req,res){
    return get_renters(req)
        .then((renters)=>{
            renters_self(req,renters);
            const total =get_total(req)
                .then((total)=>{
                    renters.total = total;
                    const accepts = req.accepts(['application/json']);
                    if(!accepts){
                        res.status(406).send("Not Acceptable");
                    }else if(accepts === 'application/json'){
                        res.status(200).json(renters);
                    }

                })

        }).catch(function(error){
            res.status(403).send("Forbidden")
        })

});


//      GET     /renters/{id}
router.get('/:id',checkJwt, function(req,res){
    const renter = get_renter(req.params.id)
        .then((renter)=>{
            const accepts = req.accepts(['application/json']);
            var user_id = renter[0].u_id;
            if(user_id && user_id !== req.user.sub){
                res.status(401).send("Unauthorized");
            }else if(!accepts){
                res.status(406).send("Not Acceptable");
            }else if(accepts === 'application/json'){
                renter[0].self=req.protocol+"://"+req.get("host")+"/renters/"+renter[0].id;
                if(renter[0].space.length>0){
                    for(var i=0;i<renter[0].space.length;i++){
                        renter[0].space[i].self=req.protocol+"://"+req.get("host")+"/spaces/"+renter[0].space[i].s_id;
                    }
                }
                res.status(200).json(renter[0]);
            }
        }).catch(function(error){
            res.status(403).send("Forbidden")
        })
});


//      POST        /renters
router.post('/', function(req, res){
    var name = req.body.first+' '+req.body.last;
    var options = { method: 'POST',
        url: 'https://whited6.auth0.com/oauth/token',
        headers: { 'content-type': 'application/json' },
        body:
            { grant_type: 'client_credentials',
                client_id: 'nPWg6bU5A3P7Zl3e1Eej3cb6fmK5G9Xq',
                client_secret: 'MPbI3BXOeIWlG4AkU-J-pesu-XHjVIMNnTF6jV93XagBNh3pbV7A-nebHz-yZ9-z',
                audience: 'https://whited6.auth0.com/api/v2/' },
        json: true };

    request(options, function (error, response, body) {
        if (error)
            throw new Error(error);
        create_login(body.access_token, name, req.body.email, req.body.username, req.body.password)
            .then((login_data)=>{
                var u_id=login_data.user_id;
                post_renters(u_id,req)
                    .then(key => {res.status(201).send('{ "self": "'+ req.protocol + '://'
                        + req.get("host") + '/renters/' + key.id +'" }')} )
            }).catch(function(error){
            res.status(403).send("Forbidden")
        })

    })

});

//      PUT         /renters/{id}
router.put('/:id', checkJwt, function(req,res){
    const old_renter = get_renter(req.params.id)
        .then((old_renter)=>{
            if(old_renter[0].u_id && old_renter[0].u_id !==req.user.sub){
                res.status(401).send("Unauthorized");
            }else{
                put_renter(req.params.id,req.body, old_renter[0])
                    .then(key=> {res.status(303).location(req.protocol + "://" + req.get("host") + "/renters/" + key.id).end();
                    })
            }
        }).catch(function(error){
            res.status(403).send("Forbidden")
        })
});


//      DELETE      /renters/{id}
router.delete('/:id', checkJwt, function(req,res){
    var user_id= req.user.sub;
    var options = { method: 'POST',
        url: 'https://whited6.auth0.com/oauth/token',
        headers: { 'content-type': 'application/json' },
        body:
            { grant_type: 'client_credentials',
                client_id: 'nPWg6bU5A3P7Zl3e1Eej3cb6fmK5G9Xq',
                client_secret: 'MPbI3BXOeIWlG4AkU-J-pesu-XHjVIMNnTF6jV93XagBNh3pbV7A-nebHz-yZ9-z',
                audience: 'https://whited6.auth0.com/api/v2/' },
        json: true };

    request(options, function (error, response, body) {
        if (error){
            res.status(404).send("Not Found");
            throw new Error(error);
        }


        get_renter(req.params.id)
            .then((renter)=> {
                if (renter[0].u_id && renter[0].u_id !== user_id ) {
                    res.status(401).send("Unauthorized");
                }else{
                    var b_token = 'Bearer ' + body.access_token;
                    var options2 = {
                        method: 'DELETE',
                        url: 'https://whited6.auth0.com/api/v2/users/' + renter[0].u_id,
                        headers: {
                            'content-type': 'application/json',
                            'Authorization': b_token
                        }
                    };

                    request(options2, function (error, response, body) {
                        if (error){
                            res.status(404).send("Not Found");
                            throw new Error(error);
                        }

                        delete_renters(req.params.id)
                            .then(() => {
                                res.status(204).end()
                            })
                    })
                }
            }).catch(function(error){
            res.status(403).send("Forbidden")
        })

    })
});

//      POST    /renters/{r_id}/spaces/{s_id}
//  -add space to renter
router.post('/:r_id/spaces/:s_id', checkJwt,function(req,res){
    get_renters_np()
      .then((renters)=>{

          if(check_spaces(renters,req.params.s_id)){
              res.status(403).send("Space Occupied");
          }else {
              get_renter(req.params.r_id)
                  .then((renter)=>{
                      if(renter[0].u_id && renter[0].u_id !== req.user.sub){
                          res.status(401).send("Unauthorized");
                      }else{
                          add_space(req.params.r_id, req.params.s_id,renter[0])
                              .then((key)=>res.status(201).send('{ "self": "'+ req.protocol + '://'
                                  + req.get("host") + '/renters/' + key.id +'" }'))
                      }

                  });

          }
      }).catch(function(error){
        res.status(403).send("Forbidden")
    })
});


//      DELETE  /renters/{r_id}/spaces/{s_id}
//  -delete space from renter
router.delete('/:r_id/spaces/:s_id', checkJwt, function(req,res){
    get_renter(req.params.r_id)
        .then((renter)=>{
            if(renter[0].u_id && renter[0].u_id !== req.user.sub){
                res.status(401).send("Unauthorized");
            }else{
                delete_space(renter[0],req.params.s_id)
                    .then((key)=>{
                        res.status(204).send('{ "self": "'+ req.protocol + '://'
                            + req.get("host") + '/renters/' + key.id +'" }')
                    })
            }

        }).catch(function(error){
        res.status(403).send("Forbidden")
    })
});

//      GET     /renters/{r_id}/spaces
//  -gets the renters spaces
router.get('/:r_id/spaces', checkJwt, function(req,res){
    get_renter(req.params.r_id)
        .then((renter)=>{
            const accepts = req.accepts(['application/json']);
            if(renter[0].u_id && renter[0].u_id !== req.user.sub){
                res.status(401).send("Unauthorized");
            }else if (!accepts){
                res.status(406).send("Not Acceptable");
            }else{
                get_renter_spaces(req)
                    .then((renter)=>{
                        res.status(200).send(renter);
                    });
            }
        }).catch(function(error){
        res.status(403).send("Forbidden")
    })

});

//      POST    /renters/{r_id}/cars/{c_id}
//  -add car to renter
router.post ('/:r_id/cars/:c_id',checkJwt, function(req,res){
   var car = get_car(req.params.c_id);
   var renter = get_renter(req.params.r_id);
   Promise.all([car,renter]).then(function(values){
       var car = values[0][0];
       var renter_id = values[1][0].id;

       if(values[1][0].u_id && values[1][0].u_id !== req.user.sub){
           res.status(401).send("Unauthorized");
       }
       else if(car.owner){
           res.status(403).send("Car has owner");
       }else {
           post_car2renter(car, renter_id)
               .then((key)=>{
                   res.status(201).send('{ "self": "'+ req.protocol + '://'
                       + req.get("host") + '/renters/' + renter_id +'" }');
               })

       }
   }).catch(function(error){
       res.status(404).send("Not Found");
   })
});


//      DELETE  /renters/{r_id}/cars/{c_id}
//  -remove car from renter
router.delete('/:r_id/cars/:c_id', checkJwt, function(req,res){
   var car = get_car(req.params.c_id);
   var renter = get_renter(req.params.r_id);
   Promise.all([car,renter]).then(function(values){
       var car = values[0][0];
       var renter = values[1][0];
       if(renter.u_id && renter.u_id !== req.user.sub){
           res.status(401).send("Unauthorized");
       }else if(car.owner && car.owner !== renter.id){
           res.status(403).send("Renter does not own car");
       }else {
           delete_car_from_renter(car)
               .then((key)=>{
                   res.status(200).send('{ "self": "'+ req.protocol + '://'
                       + req.get("host") + '/renters/' + renter.id +'" }');
               })
       }
   }).catch(function(error){
       res.status(403).send("Forbidden")
   })
});


//      GET /renters/{r_id}/cars
//  -get the renter's cars
router.get('/:r_id/cars',checkJwt,function(req,res){
   var car = get_cars_np(req);
   var renter = get_renter(req.params.r_id);
   Promise.all([car, renter]).then(function(values){
       var cars = values[0];
       var renter = values[1][0];
       if(renter.u_id && renter.u_id !== req.user.sub){
           res.status(401).send("Unauthorized");
       }else if(car.owner && car.owner !== renter.id){
           res.status(403).send("Renter does not own car");
       }else {
           var car_results=get_renters_cars(req, renter.id,cars);
           res.status(200).send(car_results);
       }
   }).catch(function(error){
       res.status(403).send("Forbidden")
   })
});


//      POST    /renters/{r_id}/spaces/{s_id}/cars/{c_id}
//  -assign a car to a space
router.post('/:r_id/spaces/:s_id/cars/:c_id', checkJwt, function(req,res){
   var renter_id=req.params.r_id;
   var space_id=req.params.s_id;
   var car_id=req.params.c_id;

   var renter = get_renter(renter_id);
   var space = get_space(space_id);
   var car = get_car(car_id);

   Promise.all([renter,space,car]).then(function(values){
       var renter_data=values[0][0];
       var space_data=values[1][0];
       var car_data=values[2][0];

       if(renter_data.u_id && renter_data.u_id !== req.user.sub){
           res.status(401).send("Unauthorized");
       }else if(renter_data.id !== car_data.owner )
           res.status(403).send("Not the renters car");
       else if(!checkForSpace(space_data.id,renter_data.space)){
           res.status(403).send("Space is not rented by Renter")
       }else{
           post_car2space(req, car_data, space_id)
               .then(()=>{
                   res.status(201).send('{ "self": "'+ req.protocol + '://'
                       + req.get("host") + '/renters/' + renter_id +'" }');
               })
       }

   }).catch(function(error){
       res.status(403).send("Forbidden")
   })

});

//      DELETE  /renters/{r_id}/spaces/{s_id}/cars/{c_id}
//  -delete a car to a space
router.delete('/:r_id/spaces/:s_id/cars/:c_id', checkJwt, function(req,res){
    var renter_id=req.params.r_id;
    var space_id=req.params.s_id;
    var car_id=req.params.c_id;

    var renter = get_renter(renter_id);
    var space = get_space(space_id);
    var car = get_car(car_id);

    Promise.all([renter,space,car]).then(function(values){
        var renter_data=values[0][0];
        var space_data=values[1][0];
        var car_data=values[2][0];

        if(renter_data.uid && renter_data.uid !== req.user.sub){
            res.status(401).send("Unauthorized");
        }else if(renter_data.id !== car_data.owner ){
            res.status(403).send("Not the renters car");
        }else if(!checkForSpace(space_data.id,renter_data.space)){
            res.status(403).send("Space is not rented by Renter")
        }else{
            delete_car_from_space(req, car_data, space_id)
                .then(()=>{
                    res.status(200).send('{ "self": "'+ req.protocol + '://'
                        + req.get("host") + '/renters/' + renter_id +'" }');
                })
        }

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