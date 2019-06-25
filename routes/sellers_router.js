// var local = process.argv.slice(2);
// var express = require('express');
// var url = require('url');

// var sellerRouter = express.Router();
// var schema_seller = require('../schema/schema_seller');

// var mongodb = require("mongodb");
// var ObjectID = mongodb.ObjectID;

// var config = require('../config'); // get our config file
// var collectionName =config.collection_seller;
// var connectionurl=config.url_server;
// if(local=="local")connectionurl=config.url_local;
// console.log(connectionurl);

// // Create a database variable outside of the database connection callback to reuse the connection pool in your app.
// var db;
// var coll;

// // Connect to the database before starting the application server.
// mongodb.MongoClient.connect(connectionurl, function (err, database) { //process.env.MONGODB_URI
//   if (err) {
//     console.log(err);
//     process.exit(1);
//   }

//   // Save database object from the callback for reuse.
//   db = database;
//   console.log("Database connection ready for seller");
//   coll = db.collection(collectionName);
 
// });


// /*  "/sellers"
//  *    GET: finds all sellers
//  *    POST: creates a new seller
//  */

// var findAll = function(req, res) {
// 	coll.find().toArray(function(err, sellers) {
// 			if (err) {
// 				handleError(res, err, "Failed to get all sellers.");
// 			} else {
// 				res.status(200).json({'count':sellers.length,'results':sellers});
// 			}			
// 		});
// 	};

// var addseller = function(req, res) {
// 	var seller = req.body;

// 	// validation check of input details
// 	req.checkBody(schema_seller)
// 	req.sanitizeBody('email').trim();
// 	var errors = req.validationErrors();
//  	if (errors) {
//     	res.send(errors);
//     	return;
//   	}

// 	console.log('Adding seller: ' + JSON.stringify(seller));
//     coll.insertOne(seller, {safe:true}, function(err, result) {
// 			if (err) {
// 				handleError(res, err, "Failed to create new sellers.");
// 			} else {
// 				// result=JSON.parse(result)
// 				// console.log('Success: ' + result.ok);
// 				// res.send(seller);
// 				 res.status(201).json(result.ops[0]);
// 			}
// 		});
// 	};

//   "/sellers/:id"
//  *    GET: find seller by id
//  *    PUT: update seller by id
//  *    DELETE: deletes seller by id
 

// var findById = function(req, res) {
// 	var id = req.params.id;
// 	console.log('Retrieving seller: ' + id);
// 	coll.findOne({'_id': new ObjectID(id)}, function(err, seller) {
// 			if (err) {
// 				 handleError(res, err, "Failed to get seller by id");
// 			} else {
// 				res.status(200).json(seller);
// 			}
// 		});
// 	};

// var updateseller = function(req, res) {
// 	var id = req.params.id;
// 	var seller = req.body;
// 	var objectid=new ObjectID(id);
// 	seller['_id']=objectid;
// 	console.log('Updating seller: ' + id);
// 	coll.updateOne({'_id':objectid}, seller, {safe:true}, function(err, result) {
// 			if (err) {
// 				handleError(res, err, "Failed to update seller");
// 			} else {
// 				console.log('' + result + ' document(s) updated');
// 				res.status(200).json(seller);
// 			}
// 		});
// 	};

// var deleteseller = function(req, res) {
// 	var id = req.params.id;
// 	var seller = req.body;
// 	console.log('Deleting seller: ' + id);
// 	coll.deleteOne({'_id':new ObjectID(id)}, {safe:true}, function(err, result) {
// 			if (err) {
// 				handleError(res, err, "Failed to delete seller");
// 			} else {
// 				console.log('' + result + ' document(s) deleted');
// 				res.status(200).json(seller);
// 			}
// 		});
// 	};

// var query = function(req, res) {
// 	var query = url.parse(req.url, true).query;
// 	// console.log(query);
// 	coll.find(query).toArray(function(err, sellers) {
// 			if (err) {
// 				handleError(res, err, "Failed to get sellers.");
// 			} else {
// 				res.status(200).json({'count':sellers.length,'results':sellers});
// 			}			
// 		});
// 	};

// sellerRouter.get('/', findAll);
// sellerRouter.post('/', addseller);
// sellerRouter.get('/:id', findById);
// sellerRouter.put('/:id', updateseller);//change to put
// sellerRouter.delete('/:id', deleteseller);
// sellerRouter.get('/query/parameter', query);


// module.exports = sellerRouter;

// // Generic error handler used by all endpoints.
// function handleError(res, err, custommessage, code) { 
//  console.log("ERROR: " + err.message);
//   console.log("message: " + custommessage);
//   console.log("stack: " + err.stack);
//   res.status(code || 500).json({"error": err.message});
// }
