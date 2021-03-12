var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var fs = require("fs");

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

function getTasksFromStringContent(str){
	var tasks = [];
	var lines = str.split("\n");
	lines.forEach(l=>{
		let fields = l.split(",");
		if(fields.length>=3){
			let task = {};
			task["id"] = fields[0];
			task["name"] = fields[1];
			task["isDone"] = fields[2]==='1';
			tasks.push(task);
		}
	});
	return tasks;
}

function getStringContentFromTasks(tasks){
	var str = '';
	tasks.forEach(t=>{
		str += t.id;
		str += ",";
		str += t.name;
		str += ",";
		str += t.isDone ? '1' : '0';
		str += "\n";
	});
	return str;
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
	fs.readFile( __dirname + "/" + "data/tasks.csv", 'utf8', function (err, data) {
		var tasks = getTasksFromStringContent(data);
		var response = {};
		response["success"] = true;
		response["tasks"] = tasks;
		res.end(JSON.stringify(response));
	});
});
app.get('/task/:id', function (req, res) {
	fs.readFile( __dirname + "/" + "data/tasks.csv", 'utf8', function (err, data) {
		var tasks = getTasksFromStringContent(data);
		var id = req.params.id;
		var result = tasks.filter(t=>t.id==id);
		var response = {};
		if(result.length>0){
			response["success"] = true;
			response["task"] = result[0];
		}else{
			response["success"] = false;
			response["errorMessage"] = "No task found.";
		}
		res.end(JSON.stringify(response));
	});
});
app.post('/task', function (req, res) {
	fs.readFile( __dirname + "/" + "data/tasks.csv", 'utf8', function (err, data) {
		var tasks = getTasksFromStringContent(data);
		var task = req.body;
		
		var response = {};
		
		let isUpdate = false;
		if(task.id!=undefined && tasks.findIndex(t=>t.id==task.id)!=-1){
			tasks[tasks.findIndex(t=>t.id==task.id)] = task;
			isUpdate = true;
		}else{
			let newId = tasks.reduce((a,t)=>Math.max(t.id,a),-1)+1;
			task.id = newId;
			tasks.push(task);
		}
			
		fs.writeFile('data/tasks.csv', getStringContentFromTasks(tasks), function(err) {
			if (err) {
				response["success"] = false;
				response["errorMessage"] = isUpdate ? "Task updation failed." : "Task addition failed.";
			}else{
				response["success"] = true;
				response["successMessage"] = isUpdate ? "Task updated." : "Task added.";
			}
			res.end(JSON.stringify(response));
		});
	});
});
app.delete('/task/:id', function (req, res) {
	fs.readFile( __dirname + "/" + "data/tasks.csv", 'utf8', function (err, data) {
		var tasks = getTasksFromStringContent(data);
		var id = req.params.id;
		var isExist = tasks.some(t=>t.id==id);
		
		var response = {};
		
		if(!isExist){
			response["success"] = false;
			response["errorMessage"] = "Task does not exists.";
			res.end(JSON.stringify(response));
		}else{
			tasks = tasks.filter(t=>t.id!=id);
			
			fs.writeFile('data/tasks.csv', getStringContentFromTasks(tasks), function(err) {
				if (err) {
					response["success"] = false;
					response["errorMessage"] = "Task deletion failed.";
				}else{
					response["success"] = true;
					response["errorMessage"] = "Task deleted.";
				}
				res.end(JSON.stringify(response));
			});
		}
	});
});

var server = app.listen(8081, function () {
   var host = server.address().address
   var port = server.address().port
   console.log("Example app listening at http://%s:%s", host, port)
});