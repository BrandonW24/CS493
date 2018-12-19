
var express =require('express');

var app = express();
var handlebars = require('express-handlebars').create({defaultLayout:'main'});

var bodyParser = require('body-parser');



/*const Datastore = require('@google-cloud/datastore');
const projectId = 'oauth2-110418';
const datastore = new Datastore({projectId:projectId});
*/
const fetch = require('node-fetch');

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(express.static(__dirname+'/public'));
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.set('port', process.argv[2]);


//reference https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
function postData(url=``,data ={}){
    return fetch(url,{
        method:"POST",
        mode:"cors",
        headers:{
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: data,
    })
        .then(response=>response.json());

}

function getData(url=``, headers){
    return fetch(url,{
        method:"GET",
        mode:"cors",
        headers:{
            Authorization: headers,
        }
    })
        .then(response=>response.json());
}

function getState(){
    var state ="";
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789';
    for(var i=0;i<10;i++)
        state +=possible.charAt(Math.floor(Math.random() * possible.length));
    return state;
}
var uri = "https://accounts.google.com/o/oauth2/v2/auth";
var redirect_uri = "https://oauth-110418.appspot.com/redirect";
var client_id = "32916600674-smsdg59ka5802gigaq51qp53pv4g5uej.apps.googleusercontent.com";
var scope = "email";
var state = "FFEy0heojCc09vZ2kobF4p2l";
var response_type = "code";

app.get('/', function(req, res){
    var content ={};
    content.redirect_uri=redirect_uri;
    content.client_id=client_id;
    content.state=state;


    res.render('request',content);
});

app.get('/redirect', function(req, res){
    var body = [];
    var content = {};

    var state = req.query.state;

    var code = req.query.code;


    var post_url = "https://www.googleapis.com/oauth2/v4/token";
    var get_url ="https://www.googleapis.com/plus/v1/people/me";

    body='code=' + code +'&client_id='+client_id+'&client_secret='+state+'&redirect_uri='+redirect_uri+'&grant_type=authorization_code' ;

    postData(post_url,body).then(data=>{
        var headerData="Bearer "+ data.access_token;
        getData(get_url, headerData )
            .then(response=>{
                content.familyName=response.name.familyName;
                content.givenName=response.name.givenName;
                content.url=response.url;
                content.state=getState();
                res.render('display',content);
            })
    }).catch(error=>console.error(error));

});


app.use(function(req, res, next){
    res.status(404);
    res.render('404');
});

app.use(function(err,req,res,next){
    console.error(err.stack);
    res.type('plain/text');
    res.status(500);
    res.render('500');
});

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`)
});
