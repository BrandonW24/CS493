const express = require('express');
const app = express();

const Datastore = require('@google-cloud/datastore');
const bodyParser = require('body-parser');

const projectId = 'cargo-102218';
const datastore = new Datastore({projectId:projectId});

const SHIP = "Ship";
const CARGO = "Cargo";

const router_ships = express.Router();
const router_cargo = express.Router();

app.use(bodyParser.json());

function fromDatastore(item){
    item.id = item[Datastore.KEY].id;
    return item;
}

/* ------------- Begin Ship Model Functions ------------- */
/*************** Post_ship() *****************/
/* creates new ship                          */

function post_ship(ship_name, ship_type, ship_length){
    var key = datastore.key(SHIP);
	const new_ship = {"ship_name": ship_name, "ship_type": ship_type, "ship_length": ship_length};
	return datastore.save({"key":key, "data":new_ship}).then(() => {return key});
}

/************* get_ships() *******************/
/*  returns list of all ships                */

function get_ships(){
	const q = datastore.createQuery(SHIP);
	return datastore.runQuery(q).then( (entities) => {
        return entities[0].map(fromDatastore);
		});
}
function get_ships_page(req){
    var q = datastore.createQuery(SHIP).limit(3);
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
    });
}
/************* get_ship() *******************/
/*  returns individual ship                */

function get_ship(id){
    const key = datastore.key([SHIP,parseInt(id,10)]);
    const q = datastore.createQuery(SHIP).filter('__key__','=', key);
    return datastore.runQuery(q).then( (entities) =>{
        return entities[0].map(fromDatastore);
    });
}

/************* put_ship() *******************/
/*  update ship                             */
function put_ship(id, new_ship_name, new_ship_type, new_ship_length, old_ship){
    const key = datastore.key([SHIP, parseInt(id,10)]);
    if(new_ship_name === undefined)
        new_ship_name = old_ship.ship_name;
    if(new_ship_type === undefined)
        new_ship_type = old_ship.ship_type;
    if(new_ship_length === undefined)
        new_ship_length = old_ship.ship_length;
    const ship = {"ship_name": new_ship_name, "ship_type": new_ship_type, "ship_length": new_ship_length};
    return datastore.update({"key":key, "data":ship}).then(()=> {return key});
}
/************* remove_ship_from_cargo **********/
/* removes the ship from cargo carrier field   */
function remove_ship_from_cargo(cargo){
    const c_key = datastore.key([CARGO,parseInt(cargo.id,10)]);
    const cargo_data = {"carrier":null, "content":cargo.content,
        "delivery_date":cargo.delivery_date, "weight": cargo.weight};
    datastore.update({"key":c_key, "data":cargo_data})
}
/************* delete_ship() *******************/

function delete_ship(id){
    const q= datastore.createQuery(CARGO);
    return datastore.runQuery(q)
        .then( (entities)=>{
            var cargo = entities[0].map(fromDatastore)
            for(var i=0;i<cargo.length;i++){
                if(cargo[i].carrier === id){
                    remove_ship_from_cargo(cargo[i]);
                }
            }
        }).then(()=>{
            const s_key = datastore.key([SHIP,parseInt(id,10)]);
            return datastore.delete(s_key);
        })
}
/* ------------- Begin Cargo Model Functions ------------- */
/*************** Post_cargo() *****************/
/* creates new cargo                          */
function post_cargo(weight, content, delivery_date){
    var key = datastore.key(CARGO);
    const new_cargo ={"weight": weight, "content": content,"delivery_date": delivery_date,"carrier": null};
    return datastore.save({"key":key, "data":new_cargo})
        .then( ()=>{return key});

}

/*************** Get_all_cargo() *****************/
/* view all cargo                            */
function get_all_cargo(){
    const q = datastore.createQuery(CARGO);
    return datastore.runQuery(q).then( (entities) =>{
        return entities[0].map(fromDatastore);
    });
}

function get_all_cargo_page(req){
    var q = datastore.createQuery(CARGO).limit(3);
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
    });
}
/*************** Get_cargo() *****************/
/* view cargo                                */
function get_cargo(id){
    const key = datastore.key([CARGO, parseInt(id,10)]);
    const q = datastore.createQuery(CARGO).filter('__key__','=',key);
    return datastore.runQuery(q).then((entities) =>{
        return entities[0].map(fromDatastore);
    });

}
/************* delete_cargo() *******************/

function delete_cargo(id){
    const key = datastore.key([CARGO,parseInt(id,10)]);
    return datastore.delete(key);
}
/**************get_piece_cargo() *************/
/* view a piece of cargo on a ship           */
function get_piece_cargo(s_id, c_id){

}

/*************** Put_cargo() *****************/
/* update cargo                              */
function put_cargo(id, weight,carrier, content, delivery_date, old){
    const key = datastore.key([CARGO, parseInt(id,10)]);
    if(weight === undefined) {
        weight = old.weight;
    }
    if(carrier === undefined) {
        carrier = old.carrier;
    }
    if(content === undefined) {
        content = old.content;
    }
    if (delivery_date === undefined) {
        delivery_date = old.delivery_date;
    }
    const cargo = {'weight': weight, 'carrier': carrier, 'content': content, 'delivery_date': delivery_date};
    return datastore.update({"key": key, "data": cargo}).then(() => {
        return key
        });
    }

/*************** Delete_Unload_cargo() ************/
/* unload cargo from ship                         */
function delete_unload_cargo(s_id, c_id){
    const key = datastore.key([CARGO, parseInt(c_id,10)]);
    const q = datastore.createQuery(CARGO).filter('__key__','=',key);
    return datastore.runQuery(q).then((entities) =>{
        const cargo=(entities[0].map(fromDatastore));
        if(cargo[0].carrier === s_id){
            const cargo_tag ={'weight':cargo[0].weight,'carrier':null, 'content':cargo[0].content, 'delivery_date':cargo[0].delivery_date};
            return datastore.update({"key":key, "data":cargo_tag}).then(()=>{
                return key
            })
        }
        else{
            return null;
        }
    })
}

/* ------------- End Model Functions ------------- */




/* ------------- Begin Controller Functions ------------- */

/*************************************************************************/
/****************Ships****************************************************/
/*************************************************************************/

/* ------------- Get all ships --------------------------*/

router_ships.get('/', function(req, res){
    let cargo_results;
    return get_all_cargo()
        .then(cargo =>{
            cargo_results = cargo;
            return get_ships_page(req);
        }).then(ship_results =>{
            for(var i=0;i<ship_results.items.length;i++){
                ship_results.items[i].self = req.protocol + "://" + req.get("host") + "/ships/" + ship_results.items[i].id;
                let j=0;
                ship_results.items[i].cargo=[];
                for (var k = 0; k < cargo_results.length; k++) {
                    (function(i){
                    })(i);
                    if(cargo_results[k].carrier === ship_results.items[i].id){
                        ship_results.items[i].cargo[j]={
                            "id": cargo_results[k].id,
                            "content": cargo_results[k].content,
                            "delivery_date": cargo_results[k].delivery_date,
                            "weight": cargo_results[k].weight,
                            "self": req.protocol + "://" + req.get("host") + "/cargo/" + cargo_results[i].id
                        };
                        j++;
                    }
                }
            }
            res.status(200).json(ship_results);
        })
});


/* ------------- Get individual ship ------------------*/
router_ships.get('/:id', function(req, res){
    let ship_result;
    const ship = get_ship(req.params.id)
        .then( (ship) => {
            ship_result=ship;
            ship[0].self=req.protocol+"://"+req.get("host")+"/ships/"+ship[0].id;
            const cargo = get_all_cargo()
                .then((cargo)=>{
                    let j=0;
                    ship_result[0].cargo=[];
                    for(var i=0;i<cargo.length;i++) {
                        if (cargo[i].carrier === req.params.id) {
                            ship_result[0].cargo[j] = {
                                "id": cargo[i].id, "content": cargo[i].content, "delivery_date": cargo[i].delivery_date,
                                "weight": cargo[i].weight,
                                "self": req.protocol + "://" + req.get("host") + "/cargo/" + cargo[i].id
                            };
                            j++;
                        }
                    }
                    res.status(200).json(ship_result);
                });
        });
});
//add ship
/* ------------- Create ship ------------------*/
router_ships.post('/', function(req, res){
    post_ship(req.body.ship_name, req.body.ship_type, req.body.ship_length)
    .then( key => {res.status(201).send('{ "id": ' + key.id + ' }')} );
});

//modify ship
/* ------------- Update ship ------------------*/
router_ships.put('/:id', function(req, res){
    const old_ship = get_ship(req.params.id)
        .then( (old_ship) => {
            put_ship(req.params.id, req.body.ship_name, req.body.ship_type, req.body.ship_length, old_ship[0])
                .then(key=> {res.status(201).send('{"id": '+key.id + ' }')});
        })
});

//unload ship
/* ------------- Delete ship ------------------*/
router_ships.delete('/:id', function(req, res){
    delete_ship(req.params.id).then(res.status(204).end())
});



/**************************************************************************/
/******************Ship and Cargo******************************************/
/**************************************************************************/
/*------------Add Cargo to ship --------------*/
router_ships.patch('/:s_id/cargo/:c_id',function(req,res){
    const old_cargo = get_cargo(req.params.c_id)
        .then((old_cargo)=>{
            if(!old_cargo[0].carrier) {
                const cargo_update = put_cargo(req.params.c_id, undefined, req.params.s_id, undefined, undefined, old_cargo[0])
                    .then((cargo_update) => {
                        res.status(200).send('{"id": ' + cargo_update.id + ' }');
                    })
            }
            else res.status(403).end();
        })
});

/*-----------Remove cargo from ship -----------*/
router_ships.delete('/:s_id/cargo/:c_id', function(req, res){
    const unloaded = delete_unload_cargo(req.params.s_id, req.params.c_id)
        .then(key =>{res.status(200).send('{"id": '+ key.id+' }')})
        .catch(function(){
            res.status(404).end();
        })

});

/*---------- Get piece of cargo on ship ------*/
router_ships.get('/:s_id/cargo/:c_id',function(req,res){
    let cargo_result;
    const cargo = get_cargo(req.params.c_id)
       .then( (cargo)=>{
           cargo_result = cargo;
           if(cargo[0].carrier === req.params.s_id)
           {
               cargo[0].self = req.protocol + "://" + req.get("host") + "/cargo/" + cargo[0].id;
               if(cargo[0].carrier) {
                   return get_ship(cargo[0].carrier)
                       .then((ship_result) => {
                           cargo_result[0].carrier = {
                               "id": ship_result[0].id,
                               "name": ship_result[0].name,
                               "self": req.protocol + "://" + req.get("host") + "/ships/" + ship_result[0].id
                           };
                           res.status(200).json(cargo_result);
                       })
               }
           }
           else
               res.status(404).end();
       })
});

/*------------ Get all cargo on ship ------*/
router_ships.get('/:s_id/cargo/', function(req,res){
    let ship_cargo =[];
    const cargo = get_all_cargo()
       .then( (cargo)=>{
           let j = 0;
           for(var i=0;i<cargo.length;i++){
                if(cargo[i].carrier === req.params.s_id){
                    ship_cargo[j]={"id": cargo[i].id,"content": cargo[i].content, "delivery_date": cargo[i].delivery_date,
                        "weight": cargo[i].weight,
                        "self": req.protocol + "://" + req.get("host")+"/cargo/"+cargo[i].id };

                    j++;
                }
           }
           res.send(ship_cargo);
       })
});

/*************************************************************************/
/****************Cargo****************************************************/
/*************************************************************************/

/* ------------ Create Cargo ------------------*/
router_cargo.post('/',function(req,res){
    post_cargo(req.body.weight,req.body.content, req.body.delivery_date)
        .then(key => {res.status(201).send('{ "id": ' +key.id+ ' }')} )
});

/* ------------ Get All Cargo --------------*/
router_cargo.get('/',function(req,res){
    let cargo_result;
    return get_all_cargo_page(req)
        .then( cargo => {
            cargo_results = cargo;
            return get_ships();
        }).then(ship_results => {
            for (var i = 0; i < cargo_results.items.length; i++) {
                cargo_results.items[i].self = req.protocol + "://" + req.get("host") + "/cargo/" + cargo_results.items[i].id;
                var found;
                if (cargo_results.items[i].carrier) {
                    for(var k=0;k<ship_results.length;k++){
                        (function (k) {
                        })(k);
                        if(cargo_results.items[i].carrier === ship_results[k].id)
                            cargo_results.items[i].carrier = {
                                "id": ship_results[k].id,
                                "name": ship_results[k].name,
                                "self": req.protocol + "://" + req.get("host") + "/ships/" + ship_results[k].id
                        };

                    }

                }
            }
            res.status(200).json(cargo_results);
});



});

/* ------------ Get Individual Cargo -----------*/
router_cargo.get('/:id',function(req,res){
    let cargo_result;
    const cargo = get_cargo(req.params.id)
        .then( (cargo) => {
            cargo_result = cargo;
            cargo_result[0].self=req.protocol+"://"+req.get("host")+"/cargo/"+cargo[0].id;
            if(cargo_result[0].carrier) {
                return get_ship(cargo[0].carrier)
                    .then((ship) => {
                        cargo_result[0].carrier ={"id": ship[0].id, "name": ship[0].ship_name,
                            "self":req.protocol + "://"+req.get("host")+"/ships/"+ship[0].id};
                        res.status(200).json(cargo_result);
                    });
            }
            else
                res.status(200).json(cargo_result);
        })
});

/* ------------ Update Cargo -----------*/
router_cargo.put('/:id', function(req,res){
    const old_cargo = get_cargo(req.params.id)
        .then( (old_cargo) =>{
            put_cargo(req.params.id, req.body.weight, req.body.carrier, req.body.content, req.body.delivery_date, old_cargo[0])
                .then( ()=> {res.status(201).end()});
        })

});

/* ------------ Delete Cargo -------------*/
router_cargo.delete('/:id', function(req,res){
    delete_cargo(req.params.id).then(res.status(204).end())
});
/* ------------- End Controller Functions ------------- */

app.use('/ships', router_ships);
app.use('/cargo', router_cargo);

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
