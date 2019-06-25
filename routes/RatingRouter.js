// 'use strict'
module.exports = function SetupRouter(CollectionName,database,DocType) {
	
	var express = require('express');
	var url = require('url');
	var elastic = require('../elastic/elasticSearch');

	var documentRouter = express.Router();

	var mongodb = require("mongodb");
	var ObjectID = mongodb.ObjectID;

	var coll= database.collection(CollectionName);
	
	var getAllDocument = function(req, res) {
		coll.find({}).sort({ '_id': -1 }).toArray(function(err, documents) {
				if (err) {
					handleError(res, err, "Failed to get all "+DocType);
				} else {
					res.status(200).json({'count':documents.length,'results':documents});
					}			
			});
	};

	var postDocument = function(req, res) {
		var rating = req.body;
		var user_id=rating.user_id;
		var shop_id=rating.shop_id;
		var rateValue=rating.rating;
		var review=rating.review;
		var user_name=rating.user_name;
		var user_profile=rating.user_profile;
		var userRating={ 
			_id:new ObjectID(),
             user_id:new ObjectID(user_id),
             shop_id:shop_id,
             review:review,
             rating:rateValue,
             user_name:user_name,
             user_profile:user_profile,
             time:new Date()
		};

		coll.insertOne(userRating, {w:1}, function(err, result) {
				if (err) {
					handleError(res, err, "Failed to create new "+DocType);
				} else {
					res.status(201).json(result.ops[0]);
				
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

	var putDocument = function(req, res) {
		var id = req.params.id;
		var document_ = req.body;
		var objectid=new ObjectID(id);
		document_['_id']=objectid;
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

	var deleteDocument = function(req, res) {
		var id = req.params.id;
		//console.log('Deleting '+DocType+': ' + id);
		coll.deleteOne({'_id':new ObjectID(id)}, {w:1}, function(err, result) {
				if (err) {
					handleError(res, err, "Failed to delete "+DocType);
				} else {
					console.log('' + result + ' document(s) deleted');
					res.status(200).json(result);
				}
			});
	};

	var getShopRatings = function(req, res) {
		var ratingPageLimit=12;
		var shop_id = req.query.shop_id;
		var user_id = req.query.user_id;//not required as of now
		var last_rating_id=req.query.last_rating_id;
		var limit =Number(req.query.limit);

		if(limit)ratingPageLimit=limit;

		//console.log(last_rating_id);
		var cursor;
		if(last_rating_id){

				cursor=coll.aggregate([
					{
						"$match": {
						  "shop_id":shop_id
						}
					},
				    {	$sort:{'time':-1}	}, // order by time. 1=ascending | -1=descending 
				 	{
						"$match": {
								  	"_id": { "$lt": new ObjectID(last_rating_id)  } 
								  }
					},
				    { "$limit": ratingPageLimit},	  
				 
				]);

			}
			else{
				cursor=coll.aggregate([
					{
						"$match": {
						  "shop_id":shop_id
						}
					},
				    {	$sort:{'time':-1}	}, // order by time. 1=ascending | -1=descending 
				    { "$limit": ratingPageLimit},	
		     
				]);
			};
	
	   // Get all the aggregation results
		cursor.toArray(function(err, docs) {
		
			console.log(docs)
			if(!docs.length){res.status(200).json({'count':0,'last_rating_id':'null','results':docs}); return;}
			var ratings=docs;
			var len=ratings.length;
			console.log(len);
			var last_rating_id=ratings[len-1]._id;
		//	console.log(last_rating_id);
			res.status(200).json({'count':len,'last_rating_id':last_rating_id,'results':docs});
			});

	};


	
	documentRouter.get('/', getAllDocument);
	documentRouter.post('/', postDocument);
	documentRouter.get('/:id', getDocumentById);
	documentRouter.put('/:id', putDocument);//change to put
	documentRouter.delete('/:id', deleteDocument);
	documentRouter.post('/getShopRatings', getShopRatings);
	
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