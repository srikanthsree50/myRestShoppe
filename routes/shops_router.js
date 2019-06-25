var local = process.argv.slice(2);
var express = require('express');
var url = require('url');

var shopRouter = express.Router();
var schema_shop = require('../schema/schema_shop');

var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;

var config = require('../config'); // get our config file
var collectionName =config.collection_shop;
var connectionurl=config.url_server;
if(local=="local")connectionurl=config.url_local;
console.log(connectionurl);

// Create a database variable outside of the database connection callback to reuse the connection pool in your app.
var db;
var coll;

// Connect to the database before starting the application server.
mongodb.MongoClient.connect(connectionurl, function (err, database) { //process.env.MONGODB_URI
  if (err) {
    console.log(err);
    process.exit(1);
  }

  // Save database object from the callback for reuse.
  db = database;
  console.log("Database connection ready for shop");
  coll = db.collection(collectionName);
  
});


/*  "/shops"
 *    GET: finds all shops
 *    POST: creates a new shop
 */

var findAll = function(req, res) {
	coll.find().toArray(function(err, shops) {
			if (err) {
				handleError(res, err, "Failed to get all shops.");
			} else {
				res.status(200).json({'count':shops.length,'results':shops});
			}			
		});
	};

var addshop = function(req, res) {
	var shop = req.body;

	// validation check of input details
	req.checkBody(schema_shop)
	req.sanitizeBody('email').trim();
	var errors = req.validationErrors();
 	if (errors) {
    	res.send(errors);
    	return;
  	}

	console.log('Adding shop: ' + JSON.stringify(shop));
    coll.insertOne(shop, {safe:true}, function(err, result) {
			if (err) {
				handleError(res, err, "Failed to create new shops.");
			} else {
				// result=JSON.parse(result)
				// console.log('Success: ' + result.ok);
				// res.send(shop);
				 res.status(201).json(result.ops[0]);
			}
		});
	};

  "/shops/:id"
 *    GET: find shop by id
 *    PUT: update shop by id
 *    DELETE: deletes shop by id
 

var findById = function(req, res) {
	var id = req.params.id;
	console.log('Retrieving shop: ' + id);
	coll.findOne({'_id': new ObjectID(id)}, function(err, shop) {
			if (err) {
				 handleError(res, err, "Failed to get shop by id");
			} else {
				res.status(200).json(shop);
			}
		});
	};

var updateshop = function(req, res) {
	var id = req.params.id;
	var shop = req.body;
	var objectid=new ObjectID(id);
	shop['_id']=objectid;
	console.log('Updating shop: ' + id);
	coll.updateOne({'_id':objectid}, shop, {safe:true}, function(err, result) {
			if (err) {
				handleError(res, err, "Failed to update shop");
			} else {
				console.log('' + result + ' document(s) updated');
				res.status(200).json(shop);
			}
		});
	};

var deleteshop = function(req, res) {
	var id = req.params.id;
	var shop = req.body;
	console.log('Deleting shop: ' + id);
	coll.deleteOne({'_id':new ObjectID(id)}, {safe:true}, function(err, result) {
			if (err) {
				handleError(res, err, "Failed to delete shop");
			} else {
				console.log('' + result + ' document(s) deleted');
				res.status(200).json(shop);
			}
		});
	};

var query = function(req, res) {
	var query = url.parse(req.url, true).query;
	// console.log(query);
	coll.find(query).toArray(function(err, shops) {
			if (err) {
				handleError(res, err, "Failed to get all shops.");
			} else {
				res.status(200).json({'count':shops.length,'results':shops});
			}			
		});
	};

shopRouter.get('/', findAll);
shopRouter.post('/', addshop);
shopRouter.get('/:id', findById);
shopRouter.put('/:id', updateshop);//change to put
shopRouter.delete('/:id', deleteshop);
shopRouter.get('/query/parameter', query);

module.exports = shopRouter;

// Generic error handler used by all endpoints.
function handleError(res, err, custommessage, code) {
  console.log("ERROR: " + err.message);
  console.log("message: " + custommessage);
  console.log("stack: " + err.stack);
  res.status(code || 500).json({"error": err.message});
}
