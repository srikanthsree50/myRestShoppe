// var express = require('express');
// var productRouter = express.Router();

// var mongo = require('mongodb');

// var Server = mongo.Server,Db = mongo.Db;

// var databaseName = 'productdb',collectionName = 'products';
// var url='mongodb://localhost:27017/'+databaseName;    
// // var url ="mongodb://heroku_qrtgv9w1:lj94p2ieoiatcigsj2fba2ek13@ds147480.mlab.com:47480/heroku_qrtgv9w1";    

// var server = new Server('localhost', 27017, {auto_reconnect: true});
// db = new Db(databaseName, server);

// db.open(function(err, db) {
// 	if(!err) {
// 		console.log("Connected to "+databaseName+" database");
// 		db.collection(collectionName, {strict:true}, function(err, collection) {
// 			if (err) {
// 				console.log("The "+collectionName+" collection doesn't exist. Creating it with sample data...");
// 				populateDB();
// 			}
// 		});
// 	}
// });

// var findById = function(req, res) {
// 	var id = req.params.id;

// 	console.log('Retrieving product: ' + id);
// 	db.collection(collectionName, function(err, collection) {
// 		collection.findOne({'_id':new mongo.ObjectID(id)}, function(err, item) {
// 			 if (err) {
// 				res.send({'error':'An error has occurred'+err});
// 			} else {
// 				res.send(item);
// 			}

// 		});
// 	});
// };

// var findAll = function(req, res) {
// 	db.collection(collectionName, function(err, collection) {
// 		collection.find().toArray(function(err, items) {
// 			res.send(items);
// 		});
// 	});
// };

// var addproduct = function(req, res) {
// 	var product = req.body;
// 	console.log('Adding product: ' + JSON.stringify(product));
// 	db.collection(collectionName, function(err, collection) {
// 		collection.insert(product, {safe:true}, function(err, result) {
// 			if (err) {
// 				res.send({'error':'An error has occurred'});
// 			} else {
// 				console.log('Success: ' + JSON.stringify(result[0]));
// 				res.send(result[0]);
// 			}
// 		});
// 	});
//  };

// var updateproduct = function(req, res) {
// 	var id = req.params.id;
// 	var product = req.body;
// 	console.log('Updating product: ' + id);
// 	console.log(JSON.stringify(product));
// 	db.collection(collectionName, function(err, collection) {
// 		collection.update({'_id':new mongo.ObjectID(id)}, product, {safe:true}, function(err, result) {
// 			if (err) {
// 				console.log('Error updating product: ' + err);
// 				res.send({'error':'An error has occurred'});
// 			} else {
// 				console.log('' + result + ' document(s) updated');
// 				res.send(product);
// 			}
// 		});
// 	});
// };

// var deleteproduct = function(req, res) {
// 	var id = req.params.id;
// 	console.log('Deleting product: ' + id);
// 	db.collection(collectionName, function(err, collection) {
// 		collection.remove({'_id':new mongo.ObjectID(id)}, {safe:true}, function(err, result) {
// 			if (err) {
// 				res.send({'error':'An error has occurred - ' + err});
// 			} else {
// 				console.log('' + result + ' document(s) deleted');
// 				res.send(req.body);
// 			}
// 		});
// 	});
// };

// productRouter.get('/', findAll);
// productRouter.post('/', addproduct);
// productRouter.get('/:id', findById);
// productRouter.patch('/:id', updateproduct);
// productRouter.delete('/:id', deleteproduct);


// module.exports = productRouter;
// /*--------------------------------------------------------------------------------------------------------------------*/
// // Populate database with sample data -- Only used once: the first time the application is started.
// // You'd typically not find this code in a real-life app, since the database would already exist.
// var populateDB = function() {

// 	var products = [
// 	{
// 		name: "CHATEAU DE SAINT COSME",
// 		year: "2009",
// 		grapes: "Grenache / Syrah",
// 		country: "France",
// 		region: "Southern Rhone",
// 		description: "The aromas of fruit and spice...",
// 		picture: "saint_cosme.jpg"
// 	},
// 	{
// 		name: "LAN RIOJA CRIANZA",
// 		year: "2006",
// 		grapes: "Tempranillo",
// 		country: "Spain",
// 		region: "Rioja",
// 		description: "A resurgence of interest in boutique vineyards...",
// 		picture: "lan_rioja.jpg"
// 	}];

// 	db.collection(collectionName, function(err, collection) {
// 		collection.insert(products, {safe:true}, function(err, result) {});
// 	});

// };
