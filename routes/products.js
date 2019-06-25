var local = process.argv.slice(2);
var express = require('express');
var productRouter = express.Router();

var mongo = require('mongodb');
var MongoClient = require('mongodb').MongoClient;

var config = require('../config'); // get our config file

var collectionName =config.collectionName;
var url=config.url_server;
if(local=="local")url=config.url_local;

console.log(url);

var findById = function(req, res) {
	var id = req.params.id;
	console.log('Retrieving product: ' + id);
	MongoClient.connect(url, function(err, db) {
	var collection = db.collection(collectionName);
	collection.findOne({'_id': new mongo.ObjectID(id)}, function(err, item) {
			if (err) {
				res.send({'error':'An error has occurred'+err});
			} else {
				// if (item.length == 0) {
    //       			return callback(new Error('No user with name '+name+' found.'));
    //     			}
				res.send(item);
			}
			 db.close();
		});
	});
};

var findAll = function(req, res) {
	MongoClient.connect(url, function(err, db) {
	var collection = db.collection(collectionName);
	collection.find().toArray(function(err, items) {
			if (err) {
				res.send({'error':'An error has occurred'+err});
			} else {
				
				res.send({'size':items.length,'items':items});
			}
			 db.close();
		});
	});

};

var last_id=null;
var findByPage = function(req, res) {
	var pageno = req.params.pageno;
	console.log(pageno);
	MongoClient.connect(url, function(err, db) {
	var collection = db.collection(collectionName);
	if(pageno=="1")
	{
		collection.find().limit(10).toArray(function(err, items) {
			if (err) {
				res.send({'error':'An error has occurred'+err});
			} else {
				last_id =_last(items);
				console.log(items);

				res.send(items);
			}
			 db.close();
		});
	}
	// else{
	// 	collection.find({'_id'> last_id}).toArray(function(err, items) {
	// 		if (err) {
	// 			res.send({'error':'An error has occurred'+err});
	// 		} else {
	// 			last_id =items[-1]._id;
	// 			res.send(items);
	// 		}
	// 		 db.close();
	// 	});
	// }
	});
	

};

var addproduct = function(req, res) {
	var product = req.body;
	console.log('Adding product: ' + JSON.stringify(product));
	MongoClient.connect(url, function(err, db) {
	var collection = db.collection(collectionName);
    collection.insertOne(product, {safe:true}, function(err, result) {
			if (err) {
				res.send({'error':'An error has occurred'});
			} else {
				result=JSON.parse(result)
				console.log('Success: ' + result.ok);
				res.send(product);
			}
		});
	});
};

var updateproduct = function(req, res) {
	var id = req.params.id;
	var product = req.body;
	console.log('Updating product: ' + id);
	console.log(JSON.stringify(product));
	MongoClient.connect(url, function(err, db) {
	var collection = db.collection(collectionName);
	collection.update({'_id':new mongo.ObjectID(id)}, product, {safe:true}, function(err, result) {
			if (err) {
				console.log('Error updating product: ' + err);
				res.send({'error':'An error has occurred'});
			} else {
				console.log('' + result + ' document(s) updated');
				res.send(product);
			}
		});
	});
};

var deleteproduct = function(req, res) {
	var id = req.params.id;
	console.log('Deleting product: ' + id);
	MongoClient.connect(url, function(err, db) {
	var collection = db.collection(collectionName);
	collection.deleteOne({'_id':new mongo.ObjectID(id)}, {safe:true}, function(err, result) {
			if (err) {
				res.send({'error':'An error has occurred - ' + err});
			} else {
				console.log('' + result + ' document(s) deleted');
				res.send(req.body);
			}
		});
	});
	
};

productRouter.get('/', findAll);
productRouter.post('/', addproduct);
productRouter.get('/:id', findById);
productRouter.get('/p/:pageno', findByPage);
productRouter.patch('/:id', updateproduct);
productRouter.delete('/:id', deleteproduct);

module.exports = productRouter;

