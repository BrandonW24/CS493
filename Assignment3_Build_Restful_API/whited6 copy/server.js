const express = require('express');
const app = express();

const Datastore = require('@google-cloud/datastore');
const bodyParser = require('body-parser');

const projectId = 'marina-101318';
const datastore = new Datastore({projectId:projectId});

const SHIP = "Ship";
const SLIP = "Slip"

const router_ship = express.Router();
const router_slip = express.Router();

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


/************* not_at_sea() ********************/
/* Checks if ship is at sea or on a slip       */
function not_at_sea(id){
    const q = datastore.createQuery(SLIP);
    return datastore.runQuery(q).then( (entities) => {
         var slips=(entities[0].map(fromDatastore));
         for(var i =0;i<slips.length;i++) {
             if(slips[i].slip_current_boat === parseInt(id,10)){
                 put_slip(slips[i].id, slips[i].slip_number, null, null, slips[i]);
             }
         }
    });
}

/************* delete_ship() *******************/
/*  delete ship                                */
function delete_ship(id){
    const key = datastore.key([SHIP, parseInt(id,10)]);
    not_at_sea(id);
    return datastore.delete(key);
}



/**********************************************************/
/* ------------- Begin Slip Model Functions ------------- */
/*********************************************************/

/************* post_slip() *******************/
/*  add slip                                 */
function post_slip(slip_number){
    var key = datastore.key(SLIP);
    const new_slip = {"slip_number": slip_number, "slip_current_boat": null,
        "slip_boat_arrival_date": null};
    return datastore.save({"key":key, "data":new_slip}).then(() => {return key});
}

/************* get_slips() *******************/
/*  returns slips                            */
function get_slips(){
    const q = datastore.createQuery(SLIP);
    return datastore.runQuery(q).then( (entities) => {
        return entities[0].map(fromDatastore);
    });
}

/************* get_slip() *******************/
/*  returns individual slip                 */
function get_slip(id){
    const key = datastore.key([SLIP,parseInt(id,10)]);
    const q = datastore.createQuery(SLIP).filter('__key__','=', key);
    return datastore.runQuery(q).then( (entities) =>{
        return entities[0].map(fromDatastore);
    });
}

/************* put_slip() *******************/
/*  update slip                             */
function put_slip(id, new_slip_number, new_slip_current_boat, new_slip_boat_arrival_date, old_slip){
    const key = datastore.key([SLIP, parseInt(id,10)]);
    if(new_slip_number === undefined)
        new_slip_number = old_slip.slip_number;
    if(new_slip_current_boat === undefined)
        new_slip_current_boat = old_slip.slip_current_boat;
    if(new_slip_boat_arrival_date === undefined)
        new_slip_boat_arrival_date = old_slip.slip_boat_arrival_date;
    const slip = {"slip_number": new_slip_number, "slip_current_boat": new_slip_current_boat,
        "slip_boat_arrival_date": new_slip_boat_arrival_date};
    return datastore.update({"key":key, "data":slip}).then(()=> {return key});
}

/************* delete_slip() *******************/
/*  deletes slip                               */
function delete_slip(id){
    const key = datastore.key([SLIP, parseInt(id,10)]);
    return datastore.delete(key);
}

/************* put_arrive() *******************/
/*  adds ship to slip                         */
function put_arrive(slip_id, ship_id, date){
    const key = datastore.key([SLIP,parseInt(slip_id,10)]);
    const slip = get_slip(slip_id)
        .then((slip) => {
            const slip_data = { "slip_number": slip[0].slip_number, "slip_current_boat": ship_id,
                    "slip_boat_arrival_date": date
            };

            const key_arrival =(datastore.update({"key": key, "data": slip_data}));
            return key_arrival;
        }).then(()=>{return key});
}

/************* remove_ship_from_slip() *******************/
/*  delete ship from slip                                */
function delete_ship_from_slip(slip_id, ship_id, date){
    const key = datastore.key([SLIP,parseInt(slip_id,10)]);
    const slip = get_slip(slip_id)
        .then((slip) => {
            const slip_data = { "slip_number": slip[0].slip_number, "slip_current_boat": null,
                "slip_boat_arrival_date": null
            };

            const key_arrival =(datastore.update({"key": key, "data": slip_data}));
            return key_arrival;
        }).then(()=>{return key});
}


/* ------------- End Model Functions ------------- */




/* ------------- Begin Controller Functions ------------- */

/*************************************************************************/
/****************Ships****************************************************/
/*************************************************************************/

/* ------------- Get all ships --------------------------*/
router_ship.get('/', function(req, res){
    const ships = get_ships(req)
	.then( (ships) => {
        res.status(200).json(ships);
    });
});

/* ------------- Get individual ship ------------------*/
router_ship.get('/:id', function(req, res){
    const ship = get_ship(req.params.id)
        .then( (ship) => {
            res.status(200).json(ship);
        });
});

/* ------------- Create ship ------------------*/
router_ship.post('/', function(req, res){
    post_ship(req.body.ship_name, req.body.ship_type, req.body.ship_length)
    .then( key => {res.status(201).send('{ "id": ' + key.id + ' }')} );
});

/* ------------- Update ship ------------------*/
router_ship.put('/:id', function(req, res){
    const old_ship = get_ship(req.params.id)
        .then( (old_ship) => {
            put_ship(req.params.id, req.body.ship_name, req.body.ship_type, req.body.ship_length, old_ship[0])
                .then(key=> {res.status(200).send('{id: '+key.id + '}')});
        });
});

/* ------------- Delete ship ------------------*/
router_ship.delete('/:id', function(req, res){
    delete_ship(req.params.id).then(res.status(200).end())
});



/************************************************************************/
/****************Slips***************************************************/
/************************************************************************/

/* ------------- Get slips ------------------*/
router_slip.get('/', function(req, res){
    const slips = get_slips()
        .then( (slips) => {
            for(var i=0;i<slips.length;i++){
                if(slips[i].slip_current_boat !== null)
                    slips[i].ship_url=req.protocol+"://"+req.get("host")+"/ships/"+slips[i].slip_current_boat;
            }
            res.status(200).json(slips);
        });
});

/* ------------- Get individual slip --------*/
router_slip.get('/:id', function(req, res){
    const slip = get_slip(req.params.id)
        .then( (slip) => {
            if(slip[0].slip_current_boat !== null)
                slip[0].ship_url=req.protocol+"://"+req.get("host")+"/ships/"+slip[0].slip_current_boat;
            res.status(200).json(slip);
        });
});

/* ------------- Update slip ------------------*/
router_slip.put('/:id', function(req, res){
    const old_slip = get_slip(req.params.id)
        .then( (old_slip) => {
            put_slip(req.params.id, req.body.slip_number, req.body.slip_current_boat,
                req.body.slip_boat_arrival_date, old_slip[0])
                .then(key=> {res.status(200).send('{id: '+ key.id + '}')});
        });
});

/* ------------- Post slip ------------------*/
router_slip.post('/', function(req, res){
    post_slip(req.body.slip_number, req.body.slip_current_boat, req.body.slip_boat_arrival_date)
        .then( key => {res.status(201).send('{ "id": ' + key.id + ' }')} );
});

/* ------------- Delete Slip ----------------*/
router_slip.delete('/:id', function(req, res){
    delete_slip(req.params.id).then(res.status(200).end())
});


/* ------------- Add ship to slip ----------*/
router_slip.put('/:slip_id/ships/:ship_id',function(req,res) {
    const slip = get_slip(req.params.slip_id)
        .then((slip)=> {
            if (slip[0].slip_current_boat == null) {
                const slip_update = put_slip(req.params.slip_id, undefined, req.params.ship_id, req.body.slip_boat_arrival_date, slip[0])
                    .then((slip_update) => {
                        res.status(200).send('{id: ' + slip_update.id + '}');
                    })
            }
            else{
                res.status(403).send('Forbidden')
            }
        })
});


/* ------------- Remove ship from slip ----------*/
router_slip.delete('/:slip_id/ships/:ship_id',function(req,res) {
    const slip = get_slip(req.params.slip_id)
        .then((slip) =>{
            const slip_update = put_slip(req.params.slip_id, undefined, null, null, slip[0])
                .then((slip_update) =>{
                    res.status(200).end()
                })
        })

});

router_slip.get('/:id/ships', function(req, res){
    const slip = get_slip(req.params.id)
        .then( (slip) => {
            const ship = get_ship(slip[0].slip_current_boat)
                .then((ship) =>{
                    res.status(200).json(ship);
                })
        });
});





/* ------------- End Controller Functions ------------- */

app.use('/ships', router_ship);
app.use('/slips', router_slip);

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
