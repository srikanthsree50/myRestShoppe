// var local = process.argv.slice(2);
// var express = require('express');
// var url = require('url');

// var productRouter = express.Router();
// var schema_product = require('../schema/schema_product');

// var mongodb = require("mongodb");
// var ObjectID = mongodb.ObjectID;

// var config = require('../config'); // get our config file
// var collectionName =config.collection_products;
// var connectionurl=config.url_server;
// if(local=="local")connectionurl=config.url_local;
// console.log(connectionurl);

// // Create a database variable outside of the database connection callback to reuse the connection pool in your app.
// var db;
// var coll;

// // Connect to the database before starting the application server.
// mongodb.MongoClient.connect(connectionurl, function (err, database) { //process.env.MONGODB_URI
//   if (err) {
// 	console.log(err);
// 	process.exit(1);
//   }

//   // Save database object from the callback for reuse.
//   db = database;
//   console.log("Database connection ready for products");
//   coll = db.collection(collectionName);
// });


// /*  "/products"
//  *    GET: finds all products
//  *    POST: creates a new product
//  */

// var findAll = function(req, res) {
// 	coll.find().toArray(function(err, products) {
// 			if (err) {
// 				handleError(res, err, "Failed to get all products.");
// 			} else {
// 				res.status(200).json({'count':products.length,'results':products});
// 			}			
// 		});
// 	};

// var addproduct = function(req, res) {
// 	var product = req.body;

// 	//validation check of input details
// 	req.checkBody(schema_product)
// 	req.sanitizeBody('email').trim();
// 	var errors = req.validationErrors();
// 	if (errors) {
// 		res.send(errors);
// 		return;
// 	}

// 	console.log('Adding product: ' + JSON.stringify(product));
// 	coll.insertOne(product, {safe:true}, function(err, result) {
// 			if (err) {
// 				handleError(res, err, "Failed to create new products.");
// 			} else {
// 				res.status(201).json(result.ops[0]);
// 			}
// 		});
// 	};

// /*  "/products/:id"
//  *    GET: find product by id
//  *    PUT: update product by id
//  *    DELETE: deletes product by id
//  */

// var findById = function(req, res) {
// 	var id = req.params.id;
// 	console.log('Retrieving product: ' + id);
// 	try {
// 		coll.findOne({'_id': new ObjectID(id)}, function(err, product) {
// 			if (err) {
// 				 handleError(res, err, "Failed to get product by id");
// 			} else {
// 				res.status(200).json(product);
// 			}
// 		});
// 	 } catch (e){
//       				handleError(res, e, "Failed to get product by id");
//     			}
// 	};

// var updateproduct = function(req, res) {
// 	var id = req.params.id;
// 	var product = req.body;
// 	var objectid=new ObjectID(id);
// 	product['_id']=objectid;
// 	console.log('Updating product: ' + id);
// 	coll.updateOne({'_id':objectid}, product, {safe:true}, function(err, result) {
// 			if (err) {
// 				handleError(res, err, "Failed to update product");
// 			} else {
// 				console.log('' + result + ' document(s) updated');
// 				res.status(200).json(product);
// 			}
// 		});
// 	};

// var deleteproduct = function(req, res) {
// 	var id = req.params.id;
// 	var product = req.body;
// 	console.log('Deleting product: ' + id);
// 	coll.deleteOne({'_id':new ObjectID(id)}, {safe:true}, function(err, result) {
// 			if (err) {
// 				handleError(res, err, "Failed to delete product");
// 			} else {
// 				console.log('' + result + ' document(s) deleted');
// 				res.status(200).json(product);
// 			}
// 		});
// 	};

// var last_id=0;
// var subdoc=0;
// var pagesize=12;
// var count=0;

// //http://localhost:8080/products/p/1?name=raj&age=2
// var findByPages = function(req, res) {
// 	var pageno = req.params.pageno;
// 	var query = url.parse(req.url, true).query;
// 	// console.log(query);
// 	// console.log(pageno);
// 	if(pageno==="1"){  
// 		coll.find(query).count(function(err, cnt) {count=cnt;console.log(count);});
// 	}
// 	else{
// 		query["_id"]={$lt: last_id};
// 		// console.log(query);
// 	}

// 	subdoc=coll.find(query).sort({ $natural: -1 }).limit(pagesize);
// 	subdoc.toArray(function(err, items) {
// 			if (err) {
// 				res.send({'error':'An error has occurred'+err});
// 				} 
// 			else{
// 					var len=items.length;
// 					if(len===0){
// 							res.send({"count":len,"results":items});
// 							return;
// 					}
// 					else{		
// 							last_id = items[len-1]['_id'];
// 							if(pageno==="1")len=count;
// 							res.send({"count":len,"results":items});
// 						}
// 				}
// 		});
// 	};

// var query = function(req, res) {
// 	// var name = req.query.name;
// 	var query = url.parse(req.url, true).query;
// 	// if(query['age'])query['age']=parseInt(query['age']);
// 	console.log(query);
// 	coll.find(query).toArray(function(err, products) {
// 			if (err) {
// 				handleError(res, err, "Failed to get all products.");
// 			} else {
// 				res.status(200).json({'count':products.length,'results':products});
// 			}			
// 		});
// 	};	

// productRouter.get('/', findAll);
// productRouter.post('/', addproduct);
// productRouter.get('/:id', findById);
// productRouter.put('/:id', updateproduct);//change to put
// productRouter.delete('/:id', deleteproduct);
// productRouter.get('/p/:pageno', findByPages);
// productRouter.get('/query/parameter', query);


// module.exports = productRouter;

// // Generic error handler used by all endpoints.
// function handleError(res, err, custommessage, code) {
//   console.log("ERROR: " + err.message);
//   console.log("message: " + custommessage);
//   console.log("stack: " + err.stack);
//   res.status(code || 500).json({"error": err.message});
// }
