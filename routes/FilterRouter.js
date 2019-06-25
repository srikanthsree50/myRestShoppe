// 'use strict'
module.exports = function SetupRouter(CollectionName,CollectionShopCategory,CollectionProduct,database,DocType) {
	
	var express = require('express');
	var url = require('url');
	var elastic = require('../elastic/elasticSearch');

	var documentRouter = express.Router();

	var mongodb = require("mongodb");
	var ObjectID = mongodb.ObjectID;

	var coll= database.collection(CollectionName);
	var shopCategoryColl=database.collection(CollectionShopCategory);
	var collProduct= database.collection(CollectionProduct);
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
		document_['last_update_date']= new Date();
		
		//console.log('Adding document_: ' + JSON.stringify(document_));
		coll.insertOne(document_, {w:1}, function(err, result) {
				if (err) {
					handleError(res, err, "Failed to create new "+DocType);
				} else {
					res.status(201).json(result.ops[0]);
				
				}
			});
	};

	
	/*  "/products/:id"
	*    GET: find product by id
	*    PUT: update product by id
	*    DELETE: deletes product by id
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

	// var getFilterLevelWise = function(req, res) {
	// 	var shop_id=req.query.shop_id;
	// 	var level1=req.query.level1;
	// 	var level2=req.query.level2;
	// 	var level3=req.query.level3;
	
	// 	var query;
	// 	if(level3){
	// 		query={ 'category.level1.name':level1,'category.level2.name':level2,'category.level3.name':level3 };
	// 	}else if (level2){
	// 		query={ 'category.level1.name':level1,'category.level2.name':level2,'category.level3.name':'#'};
	// 	}else{
	// 		query={ 'category.level1.name':level1,'category.level2.name':'#','category.level3.name':'#'};
	// 	}
		 
	// 	console.log(query);
		
	// 	try { 
	// 			shopCategoryColl.aggregate([
 //                    {
 //                        "$match": {
 //                          "shop_id":shop_id
 //                        }
 //                    },
 //                    {   $unwind:'$category'  },
 //                    {   $unwind:'$category.level3'  },
 //                    {
 //                        "$match": query
 //                    },
 //                    {
 //                        $project:{ _id:0,'filter_id':'$category.level3._id'}
 //                    }
 //                ]).toArray(function(err, result) {
 //                	if(result.length==0)
 //                		{
 //                			res.status(200).json({"response":"filter not found"});
 //                			return;
 //                		}
 //                	else{
 //                			try {
	// 							coll.findOne({'_id': new ObjectID(result[0].filter_id)}, function(err, document_) {
	// 							if (err) {
	// 								 handleError(res, err, "Failed to get "+DocType+" by id");
	// 							} else {
	// 								res.status(200).json(document_);
	// 							}
	// 							});
	// 						} catch (e){
	// 									handleError(res, e, "Failed to get "+DocType+" by id");
	// 							}
 //                		}	
	               		
	//             });

	//     } catch (e){
	//                    console.log(e);
 //            }  
		
	// };

	
	documentRouter.get('/', getAllDocument);
	documentRouter.post('/', postDocument);
	documentRouter.get('/:id', getDocumentById);
	documentRouter.put('/:id', putDocument);//change to put
	documentRouter.delete('/:id', deleteDocument); 
	// documentRouter.post('/getFilters', getFilterLevelWise);
	

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