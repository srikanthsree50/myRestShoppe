// 'use strict'
module.exports = function SetupRouter(CollectionName,database,DocType) {

	var FCM = require('fcm-node');
	var seller_server_key = "AAAAWN9BIiY:APA91bHC4-o2jp3dKvUMFYUictmlwT0oDY0c2W6DOkuhaw4dbn-WC7jtadAL8tiRSsHCrPlzVqIzFrPwTDbHWV2sWY4ZX1luRn5gfsbzL1XnEZlY7_5_VKiljGohW0xnyvWURGGCszRq"
	var seller_fcm = new FCM(seller_server_key);
	// var user_server_key = "AAAAN-PxcpQ:APA91bF0tuNR7PZx7nAB6sJsRgl8-bj8cah5T5hyASqy6tTsNhInChGC8IT1fdJ2ouSn05gj_Pqsweqj_EZc9z3IkLMWBzVD47-B8yZuKZ13u4L-Ck2Ym7zpi3sxWZOe8O29B1UdLkXZ"
	// var user_fcm = new FCM(user_server_key);

	
	var express = require('express');
	var url = require('url');
	var elastic = require('../elastic/elasticSearch');

	var documentRouter = express.Router();

	var mongodb = require("mongodb");
	var ObjectID = mongodb.ObjectID;

	var coll= database.collection(CollectionName);

	/*  "/order"
	*    GET: finds all order
	*    POST: creates a new order
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
			document_['last_date']=new Date();
		
		//console.log('Adding document_: ' + JSON.stringify(document_));
		coll.insertOne(document_, {w:1}, function(err, result) {
				if (err) {
					handleError(res, err, "Failed to create new "+DocType);
				} else {
					res.status(201).json(result);

				}
			});
	};

	
		/*  "/order/:id"
	*    GET: find order by id
	*    PUT: update order by id
	*    DELETE: deletes order by id
	*/

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

	var getDocumentByType = function(req, res) {
		var type = req.query.shop_type;
		var date_received = req.query.last_date;

		if(date_received)
			date_received=new Date(date_received);
		else
			date_received="null"	

		console.log(type);
		console.log(date_received);

		try {
		coll.findOne({'type': type}, function(err, document_) {
		if (err) {
			 handleError(res, err, "Failed to get "+DocType);
		} else {
			// console.log(typeof document_['last_date'].getTime());
			if(date_received=="null"){
				document_['isUpdated']=true;
				res.status(200).json(document_);
			}else if(document_['last_date'].getTime()==date_received.getTime()){
				// document_['isUpdated']=false;
				res.status(200).json({'isUpdated':false});
			}
			else{
				document_['isUpdated']=true;
				res.status(200).json(document_);
			}
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
		document_['last_date']=new Date();

		console.log(document_);

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
		var document_ = req.body;
		console.log('Deleting '+DocType+': ' + id);
		coll.deleteOne({'_id':new ObjectID(id)}, {w:1}, function(err, result) {
				if (err) {
					handleError(res, err, "Failed to delete "+DocType);
				} else {
					console.log('' + result + ' document(s) deleted');
					res.status(200).json(document_);
				}
			});
	};

	var getAllCategoryType = function(req, res) {
		try {
			coll.aggregate([{	
					    	$project: {	"_id":0,"type":1,isMinimumOrder:1,shop_type_image:1}
					    	},
					    	{
						       $group:
						         {
						           _id: null,
						           types: { $push: '$type'},
						           minOrderList: { $push: '$isMinimumOrder'},
						           shopTypeImage:{ $push: '$shop_type_image'},
						         }
						    }]).toArray(function(err, result) {
						    if(result.length)	
								res.status(200).json({"result":result[0].types,minOrderList:result[0].minOrderList,shopTypeImage:result[0].shopTypeImage});	
							else
								res.status(200).json({"result":[],minOrderList:[],shopTypeImage:[]});
								
								
					});


		} catch (e){
					handleError(res, e, "Failed to get "+DocType+" by id");
			}
	};

	var isMinimumOrder = function(req, res) {
		var type=req.query.type;

		coll.findOne({'type': type},{isMinimumOrder:1}, function(err, document_) {
			if (err) handleError(res, err, "Failed to get "+DocType);
			else res.status(200).json({isMinimumOrder:document_.isMinimumOrder});	
		});
	};

	documentRouter.get('/', getAllDocument);
	documentRouter.post('/', postDocument);
	documentRouter.get('/:id', getDocumentById);
	documentRouter.put('/:id', putDocument);
	documentRouter.delete('/:id', deleteDocument);
	documentRouter.post('/bytype', getDocumentByType);
	documentRouter.post('/getAllType', getAllCategoryType)
	documentRouter.post('/isMinimumOrder', isMinimumOrder)
	
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