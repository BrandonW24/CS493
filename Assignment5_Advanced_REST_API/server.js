const express = require('express');
const app = express();

const json2html = require('node-json2html');

const Datastore = require('@google-cloud/datastore');
const bodyParser = require('body-parser');

const projectId = 'advanced-rest';
const datastore = new Datastore({projectId:projectId});

const SHIP = "Ship";

const router_ships = express.Router();

app.use(bodyParser.json());

function fromDatastore(item){
    item.id = item[Datastore.KEY].id;
    return item
}

/* ------------- Begin Ship Model Functions ------------- */
/*************** Post_ship() *****************/
/* creates new ship                          */

function post_ship(name, type, length){
    var key = datastore.key(SHIP);
	const new_ship = {"name": name, "type": type, "length": length};
	return datastore.save({"key":key, "data":new_ship}).then(() => {return key})
}

/************* get_ships() *******************/
/*  returns list of all ships                */
function get_ships(req){
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

/************* put_ship() *******************/
/*  update ship                             */
function put_ship(id, new_name, new_type, new_length, old_ship){
    const key = datastore.key([SHIP, parseInt(id,10)]);
    if(new_name === undefined)
        new_name = old_ship.name;
    if(new_type === undefined)
        new_type = old_ship.type;
    if(new_length === undefined)
        new_length = old_ship.length;
    const ship = {"name": new_name, "type": new_type, "length": new_length};
    return datastore.update({"key":key, "data":ship}).then(()=> {return key})
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
                ship_results.items[i].self = req.protocol + "://" + req.get("host") + "/ships/" + ship_results.items[i].id;
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
router_ships.get('/:id', function(req, res){
    const ship = get_ship(req.params.id)
        .then( (ship) => {
            ship[0].self=req.protocol+"://"+req.get("host")+"/ships/"+ship[0].id;
            const  accepts = req.accepts(['application/json','text/html']);
            if(!accepts){
                res.status(406).send('Not Acceptable');
            }else if(accepts === 'application/json'){
                res.status(200).json(ship);
            }else if(accepts ==='text/html') {

                //var transform = {'<>':'li','html':'${text}'};
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
router_ships.post('/', function(req, res){
    post_ship(req.body.name, req.body.type, req.body.length)
    .then( key => {res.status(201).send('{ "self": "'+ req.protocol + '://' + req.get("host") + '/ships/' + key.id +'" }')} )
});

//modify ship
/* ------------- Update ship ------------------*/
router_ships.put('/:id', function(req, res){
    return get_ship(req.params.id)
        .then( (old_ship) => {
            put_ship(req.params.id, req.body.name, req.body.type, req.body.length, old_ship[0])
                .then(key=> {res.status(303).location(req.protocol + "://" + req.get("host") + "/ships/" + key.id ).end()})
        }).catch(function(error){
            console.log(error)
        })
});

//unload ship
/* ------------- Delete ship ------------------*/
router_ships.delete('/:id', function(req, res){
    delete_ship(req.params.id).then(res.status(204).end())
        .catch(function(error){
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

/* ------------- End Controller Functions ------------- */
app.use('/ships', router_ships);

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`)
});
