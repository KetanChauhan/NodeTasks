var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var fs = require("fs");

const { Client } = require('pg');
const { DataQuery } = require('./dataquery');

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

function getTasksFromRows(rows, tags){
	var tasks = [];
	var tagMap = tags.reduce(function(map, tag) {
		map[tag.id] = tag;
		return map;
	}, {});
	for(let r of rows){
		let task = {};
		task.id = r["id"];
		task.name = r["name"];
		task.isDone = r["isdone"]===1;
		task.createdOn = r["createdon"];
		task.modifiedOn = r["modifiedon"];
		task.tags = [];

		if(r["tags"] && r["tags"]!=null && r["tags"].length>0){
			let tagIds = r["tags"].split(',');
			for(let tid of tagIds){
				let tag = tagMap[tid];
				if(tag){
					task.tags.push(tag);
				}
			}
		}
		
		tasks.push(task);
	}
	return tasks;
}
function getTagsFromRows(rows){
	var tags = [];
	for(let r of rows){
		let tag = {};
		tag.id = r["id"];
		tag.name = r["name"];
		tag.color = r["color"];
		tag.createdOn = r["createdon"];
		tag.modifiedOn = r["modifiedon"];
		tags.push(tag);
	}
	return tags;
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
app.get('/task', async function (req, res) {
	try {
		var tasksResult = await client.query(DataQuery.GET_ALL_TASKS);
		var tagsResult = await client.query(DataQuery.GET_ALL_TAGS);
		
		var tasks = getTasksFromRows(tasksResult.rows, tagsResult.rows);
		var response = {};
		response["success"] = true;
		response["tasks"] = tasks;
		res.end(JSON.stringify(response));
	} catch(e) {
		console.error(e);
		var response = {};
		response["success"] = false;
		response["errorMessage"] = "Error occured";
		res.status(500).end(JSON.stringify(response));
	}
});
app.get('/task/:id', async function (req, res) {
	var id = req.params.id;
	try {
		const query = {text: DataQuery.TASK_BY_ID, values: [id]}
		var tasksResult = await client.query(query);
		var tagsResult = await client.query(DataQuery.GET_ALL_TAGS);
		
		var tasks = getTasksFromRows(tasksResult.rows, tagsResult.rows);
		var response = {};
		if(tasks.length>0){
			response["success"] = true;
			response["task"] = tasks[0];
		}else{
			response["success"] = false;
			response["errorMessage"] = "No task found.";
		}
		res.end(JSON.stringify(response));
	} catch(e) {
		console.error(e);
		var response = {};
		response["success"] = false;
		response["errorMessage"] = "Error occured";
		res.status(500).end(JSON.stringify(response));
	}
});
app.post('/task', async function (req, res) {
	var task = req.body;
	try {
		const query = {text: DataQuery.UPDATE_TASK, values: [task.name, task.isDone?1:0, task.id]}
		var taskUpdateResult = await client.query(query);

		var isTagUpdated = await this.updateTags(task, true);
		var response = {};
		if(taskUpdateResult.rowCount>0 && isTagUpdated){
			response["success"] = true;
			response["successMessage"] = "Task updated.";
		}else{
			response["success"] = false;
			response["errorMessage"] = "Task updation failed.";
		}
		res.end(JSON.stringify(response));
	} catch(e) {
		console.error(e);
		var response = {};
		response["success"] = false;
		response["errorMessage"] = "Error occured";
		res.status(500).end(JSON.stringify(response));
	}
});
app.put('/task', async function (req, res) {
	var task = req.body;

	try {
		const query = {text: DataQuery.INSERT_TASK, values: [task.name, task.isDone?1:0]}
		var taskInsertResult = await client.query(query);
		if(taskInsertResult.rowCount>0){
			task.id = taskInsertResult.rows[0].id;
		}

		var isTagUpdated = await this.updateTags(task, false);
		var response = {};
		if(taskInsertResult.rowCount>0 && isTagUpdated){
			response["success"] = true;
			response["successMessage"] = "Task added.";
			response["insertedId"] = taskInsertResult.rows[0].id;
		}else{
			response["success"] = false;
			response["errorMessage"] = "Task addition failed.";
		}
		res.end(JSON.stringify(response));
	} catch(e) {
		console.error(e);
		var response = {};
		response["success"] = false;
		response["errorMessage"] = "Error occured";
		res.status(500).end(JSON.stringify(response));
	}
});
app.delete('/task/:id', async function (req, res) {
	var id = req.params.id;
	try {
		var isTagDeleted = await this.deleteTags(id);

		const query = {text: DataQuery.DELETE_TASK, values: [id]}
		var result = await client.query(query);
		var count = result.rowCount;

		var response = {};
		if(count>0 && isTagDeleted){
			response["success"] = true;
			response["successMessage"] = "Task deleted.";
		}else{
			response["success"] = false;
			response["errorMessage"] = "Task deletion failed.";
		}
		res.end(JSON.stringify(response));
	} catch(e) {
		console.error(e);
		var response = {};
		response["success"] = false;
		response["errorMessage"] = "Error occured";
		res.status(500).end(JSON.stringify(response));
	}
});

updateTags = async function(task, isUpdate){
	try {
		if(isUpdate){
			const tagDeleteQuery = {text: DataQuery.DELETE_TAG_OF_TASK,values: [task.id]}
			var tagDeleteResult = await client.query(tagDeleteQuery);
		}

		if(task.tags.length==0){
			return true;
		}
		var insValues = [];
		const tagAddQuery = {
			text: DataQuery.INSERT_TAG_OF_TASK + task.tags.map((t) => `($${(insValues.push(task.id))}, $${(insValues.push(t.id))})`).join(','),
			values: insValues
		}
		var tagAddResult = await client.query(tagAddQuery);

		return tagAddResult.rowCount==task.tags.length;
	} catch(e) {
		console.error(e);
		return false;
	}
};

deleteTags = async function(id){
	try {
		if(task.tags.length==0){
			return true;
		}

		const tagDeleteQuery = {text: DataQuery.DELETE_TAG_OF_TASK,values: [id]}
		var tagDeleteResult = await client.query(tagDeleteQuery);
		return true;
	} catch(e) {
		console.error(e);
		return false;
	}
};

//tags
app.get('/tag', async function (req, res) {
	try {
		var tagsResult = await client.query(DataQuery.GET_ALL_TAGS);
		
		var tags = getTagsFromRows(tagsResult.rows);
		var response = {};
		response["success"] = true;
		response["tags"] = tags;
		res.end(JSON.stringify(response));
	} catch(e) {
		console.error(e);
		var response = {};
		response["success"] = false;
		response["errorMessage"] = "Error occured";
		res.status(500).end(JSON.stringify(response));
	}
});
app.get('/tag/:id', async function (req, res) {
	var id = req.params.id;
	try {
		const query = {text: DataQuery.TAG_BY_ID, values: [id]}
		var tagsResult = await client.query(query);
		
		var tags = getTagsFromRows(tagsResult.rows);
		var response = {};
		if(tags.length>0){
			response["success"] = true;
			response["tag"] = tags[0];
		}else{
			response["success"] = false;
			response["errorMessage"] = "No tag found.";
		}
		res.end(JSON.stringify(response));
	} catch(e) {
		console.error(e);
		var response = {};
		response["success"] = false;
		response["errorMessage"] = "Error occured";
		res.status(500).end(JSON.stringify(response));
	}
});
app.post('/tag', async function (req, res) {
	var tag = req.body;
	try {
		const query = {text: DataQuery.UPDATE_TAG, values: [tag.name, tag.color, tag.id]}
		var tagUpdateResult = await client.query(query);

		var response = {};
		if(tagUpdateResult.rowCount>0){
			response["success"] = true;
			response["successMessage"] = "Tag updated.";
		}else{
			response["success"] = false;
			response["errorMessage"] = "Tag updation failed.";
		}
		res.end(JSON.stringify(response));
	} catch(e) {
		console.error(e);
		var response = {};
		response["success"] = false;
		response["errorMessage"] = "Error occured";
		res.status(500).end(JSON.stringify(response));
	}
});
app.put('/tag', async function (req, res) {
	var tag = req.body;

	try {
		const query = {text: DataQuery.INSERT_TAG, values: [tag.name, tag.color]}
		var tagInsertResult = await client.query(query);

		var response = {};
		if(tagInsertResult.rowCount>0){
			response["success"] = true;
			response["successMessage"] = "Tag added.";
			response["insertedId"] = tagInsertResult.rows[0].id;
		}else{
			response["success"] = false;
			response["errorMessage"] = "Tag addition failed.";
		}
		res.end(JSON.stringify(response));
	} catch(e) {
		console.error(e);
		var response = {};
		response["success"] = false;
		response["errorMessage"] = "Error occured";
		res.status(500).end(JSON.stringify(response));
	}
});
app.delete('/tag/:id', async function (req, res) {
	var id = req.params.id;
	try {
		const query = {text: DataQuery.DELETE_TAG, values: [id]}
		var result = await client.query(query);
		var count = result.rowCount;
		var response = {};
		if(count>0){
			response["success"] = true;
			response["successMessage"] = "Tag deleted.";
		}else{
			response["success"] = false;
			response["errorMessage"] = "Tag deletion failed.";
		}
		res.end(JSON.stringify(response));
	} catch(e) {
		console.error(e);
		var response = {};
		response["success"] = false;
		response["errorMessage"] = "Error occured";
		res.status(500).end(JSON.stringify(response));
	}
});

const PORT = process.env.PORT || 5000;
var server = app.listen(PORT, function () {
   var host = server.address().address
   var port = server.address().port
   console.log("Example app listening at http://%s:%s", host, port)
});
