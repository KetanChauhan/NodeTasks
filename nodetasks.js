var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var fs = require("fs");

const { Client } = require('pg');

process.env.NODE_TLS_REJECT_UNAUTHORIZED='0'
var dbUrl = process.env.DATABASE_URL;
const connectionString = dbUrl+'?ssl=true';
const client = new Client({
	connectionString,
});
client.connect();

app.use(express.static(__dirname + '/client'));
app.use(bodyParser.json({ limit: `50mb` }));
app.use(bodyParser.urlencoded({ limit: `50mb`, extended: true }));
app.use((req, res, next) => {
    res.append('Access-Control-Allow-Origin', ['*']);
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.append('Access-Control-Allow-Headers', 'Content-Type');
    res.append('Content-Type', 'application/json');
    next();
});

function getTasksFromRows(rows){
	var tasks = [];
	for(let r of rows){
		let task = {};
		task["id"] = r["id"];
		task["name"] = r["name"];
		task["isDone"] = r["isdone"]===1;
		task["createdOn"] = r["createdon"];
		task["modifiedOn"] = r["modifiedon"];
		tasks.push(task);
	}
	return tasks;
}

app.get('/', function (req, res) {
	fs.readFile( __dirname + "/" + "index.html", function(err, data) {
		if (err) {
			res.writeHead(404, {'Content-Type': 'text/html'});
			return res.end("404 Not Found");
		}
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.write(data);
		return res.end();
	});
});
app.get('/task', function (req, res) {
	client.query('SELECT * FROM task ORDER BY id')
		.then(result => {
			var tasks = getTasksFromRows(result.rows);
			var response = {};
			response["success"] = true;
			response["tasks"] = tasks;
			res.end(JSON.stringify(response));
		})
		.catch(e => console.error(e.stack));
});
app.get('/task/:id', function (req, res) {
	var id = req.params.id;
	const query = {
		text: 'SELECT * FROM task WHERE id = $1',
		values: [id]
	}
	client.query(query)
		.then(result => {
			var tasks = getTasksFromRows(result.rows);
			var response = {};
			if(tasks.length>0){
				response["success"] = true;
				response["task"] = tasks[0];
			}else{
				response["success"] = false;
				response["errorMessage"] = "No task found.";
			}
			res.end(JSON.stringify(response));
		})
		.catch(e => console.error(e.stack));
});
app.post('/task', function (req, res) {
	var task = req.body;
	const query = {
		text: 'UPDATE task SET name=$1, isdone=$2, modifiedon=current_date WHERE id=$3',
		values: [task.name, task.isDone?1:0, task.id]
	}
	client.query(query)
		.then(result => {
			var count = result.rowCount;
			var response = {};
			if(count>0){
				response["success"] = true;
				response["successMessage"] = "Task updated.";
			}else{
				response["success"] = false;
				response["errorMessage"] = "Task updation failed.";
			}
			res.end(JSON.stringify(response));
		})
		.catch(e => console.error(e.stack));
});
app.put('/task', function (req, res) {
	var task = req.body;
	const query = {
		text: 'INSERT INTO task(name,isdone,createdon,modifiedon) VALUES ($1, $2, current_date, current_date) RETURNING id',
		values: [task.name, task.isDone?1:0]
	}
	client.query(query)
		.then(result => {
			var count = result.rowCount;
			var response = {};
			if(count>0){
				response["success"] = true;
				response["successMessage"] = "Task added.";
                                response["insertedId"] = result.rows[0].id;
			}else{
				response["success"] = false;
				response["errorMessage"] = "Task addition failed.";
			}
			res.end(JSON.stringify(response));
		})
		.catch(e => console.error(e.stack));
});
app.delete('/task/:id', function (req, res) {
	var id = req.params.id;
	const query = {
		text: 'DELETE FROM task WHERE id=$1',
		values: [id]
	}
	client.query(query)
		.then(result => {
			var count = result.rowCount;
			var response = {};
			if(count>0){
				response["success"] = true;
				response["successMessage"] = "Task deleted.";
			}else{
				response["success"] = false;
				response["errorMessage"] = "Task deletion failed.";
			}
			res.end(JSON.stringify(response));
		})
		.catch(e => console.error(e.stack));
});

const PORT = process.env.PORT || 5000;
var server = app.listen(PORT, function () {
   var host = server.address().address
   var port = server.address().port
   console.log("Example app listening at http://%s:%s", host, port)
});
