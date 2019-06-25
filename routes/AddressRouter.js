// 'use strict'
module.exports = function SetupRouter(CollectionName,database,DocType) {
	
	var express = require('express');
	var url = require('url');
	var elastic = require('../elastic/elasticSearch');

	var documentRouter = express.Router();

	var mongodb = require("mongodb");
	var ObjectID = mongodb.ObjectID;

	var coll= database.collection(CollectionName);

	var AddressLimit=2;

	/*  "/products"
	*    GET: finds all products
	*    POST: creates a new product
	*/

	var getAllDocument = function(req, res) {
		//to filter out fileds to show :find({},{'name':1,'_id':0})
		coll.find({}).sort({ '_id': -1 }).toArray(function(err, documents) {
				if (err) {
					handleError(res, err, "Failed to get all "+DocType);
				} else {
					res.status(200).json({'count':documents.length,'results':documents});
					}			
			});
	};


	var postDocument = function(req, res) {
		var document_ = req.body;
		document_['last_update_date']=new Date();
		coll.insertOne(document_, {w:1}, function(err, result) {
				if (err) {
					handleError(res, err, "Failed to create new "+DocType);
				} else {
					res.status(201).json(result.ops[0]);
				}
			});
	};

	var updateDocument = function(req, res) {
		
		var document_ = req.body;
		var id = document_._id;
		var objectid=new ObjectID(id);

		document_['_id']=objectid;
		document_['last_update_date']=new Date();
		console.log('Updating '+DocType+' : ' + id);

		coll.updateOne({'_id':objectid}, document_, {w:1}, function(err, result) {
				if (err) {
					handleError(res, err, "Failed to update "+DocType);
				} else {
					console.log('' + result + ' document(s) updated');
					res.status(200).json(document_);
				}
			});
	};


	var getDocumentById = function(req, res) {
		var id = req.params.id;
		console.log('Retrieving document_: ' + id);
		try {
		coll.findOne({'_id': new ObjectID(id)}, function(err, document_) {
		if (err) {
			 handleError(res, err, "Failed to get "+DocType+" by id");
		} else {
			res.status(200).json(document_);
		}
		});
		} catch (e){
					handleError(res, e, "Failed to get "+DocType+" by id");
			}
	};


	var deleteDocument = function(req, res) {
		var id = req.params.id;
		var document_ = req.body;
		//console.log('Deleting '+DocType+': ' + id);
		coll.deleteOne({'_id':new ObjectID(id)}, {w:1}, function(err, result) {
				if (err) {
					handleError(res, err, "Failed to delete "+DocType);
				} else {
					console.log('' + result + ' document(s) deleted');
					res.status(200).json(document_);
				}
			});
	};

	//pass the user id to get the list of favourite products
	var getAddresses = function(req, res) {
		var user_id = req.query.user_id;
		var last_id = req.query.last_id;

		var limit=Number(req.query.limit);
		if(limit)AddressLimit=limit;

		var condition={};
        if(last_id)condition["_id"]= { $lt: new ObjectID(last_id) };

		var cursor=coll.aggregate([
			 	{
					"$match": { "user_id":user_id}
				},
				{
					$match: condition
				},
				{ 	$sort:{'_id':-1} 	},
				{"$limit":AddressLimit}	
		]);

	   // Get all the aggregation results
		cursor.toArray(function(err, results) {
		
			var len=results.length;
	        var last_id="null";
	        if(results.length) last_id=results[len-1]._id;
	        res.status(200).json({'count':len,'last_id':last_id,'results':results});
		});
	};

    documentRouter.get('/', getAllDocument);
	documentRouter.post('/', postDocument);
	documentRouter.post('/paginate', getAddresses);
	documentRouter.put('/', updateDocument);
	documentRouter.get('/:id', getDocumentById);
	documentRouter.delete('/:id', deleteDocument);

	console.log("Router setup for "+DocType);
	return documentRouter;

	// Generic error handler used by all endpoints.
	function handleError(res, err, custommessage, code) {
		console.log("ERROR: " + err.message);
		console.log("message: " + custommessage);
		console.log("stack: " + err.stack);
		res.status(code || 500).json({"error": err.message});
	}

};