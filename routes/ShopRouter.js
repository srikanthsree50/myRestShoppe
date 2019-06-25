
// 'use strict'
module.exports = function SetupRouter(CollectionName,CollectionShopCategory,database,DocType) {
	
	var express = require('express');
	var url = require('url');
	var elastic = require('../elastic/elasticSearch');

	var documentRouter = express.Router();

	var mongodb = require("mongodb");
	var ObjectID = mongodb.ObjectID;

	var coll= database.collection(CollectionName);
	var collShopCategory= database.collection(CollectionShopCategory);

	var ratingPageLimit=12;


	/*  "/shops"
	*    GET: finds all shops
	*    POST: creates a new shop
	*/

	var updateAllDocument = function(req, res) {
	
		coll.find().forEach(function(doc) {
		    coll.update(
		        { "_id": doc._id },
		        // { "$set": { "shop_name": "test shop name" } }
                // { "$set": { "shop_id": doc._id.toString() } }
                 { "$set": { "shopkeeper_image_url": doc.shopkepper_image_url } }
		    );
		}, function(err) {
  			// done or error
  			res.status(200).json({'completed':"yes"});
		});
	};

	var getAllDocument = function(req, res) {
		var cursor=coll.aggregate([ 
					{	$sort:{'_id':-1}	},
				    {
				      $lookup:
				         {
				            from:'shopCategory' ,
				            localField: 'shop_id',
				            foreignField: "shop_id",
				            as: "shopCategory"
				        }
				    },
					{
				     $addFields: {
				       product_images: { $arrayElemAt: ["$shopCategory.images",0] } 
				     }
				   	},
				    { $project : {'shopCategory':0 }  }
			]
			// ,	    {
   //                     explain: true
   //                   }
                     );

		cursor.toArray(function(err, documents) {
			if (err) {
					handleError(res, err, "Failed to get all "+DocType);
				} else {
					res.status(200).json({'count':documents.length,'results':documents});
					}	
			});
	};

	var paginateshops = function(req, res) {
		var last_id=req.query.last_id; 
		var last_update=req.query.last_update; 
		var limit=Number(req.query.limit);
		var shop_limit=4;
		if(limit)shop_limit=limit;

		var shopquery={};
		if(last_id)shopquery['_id']={ "$lt":new ObjectID(last_id ) };
		console.log(shopquery)
		var condition={};
		if(last_update) condition["last_update"]={ "$lt": new Date(last_update) } ;

		var cursor=coll.aggregate([ 
					{	$sort:{'_id':-1}	},
					// {	$sort:{'last_update':-1}	},
					{
						"$match": shopquery
					},
					{ "$limit": shop_limit},
			  		{
				      $lookup:
				         {
				            from:'shopCategory' ,
				            localField: 'shop_id',
				            foreignField: "shop_id",
				            as: "shopCategory"
				        }
				    },
					{
				     $addFields: {
				      product_images: { $arrayElemAt: ["$shopCategory.images",0] } 
				     }
				   	},
				    { $project : {'shopCategory':0}  }
			]);

		cursor.toArray(function(err, documents) {
			if (err) {
					handleError(res, err, "Failed to get all "+DocType);
				} else {
					if(!documents.length){res.status(200).json({'count':0,'last_id':'null','results':[]}); return;}
					var len=documents.length;
					var last_id=documents[len-1]._id;
					res.status(200).json({'count':len,'last_id':last_id,'results':documents});
					}	
			});
	};


	var postDocument = function(req, res) {
		var document_ = req.body;
		var id=new ObjectID();
		document_['_id']=id;
		document_['shop_id']=id.toString();
		document_['avgRating']=0;
		document_['last_update']=new Date();

		console.log("posting shop object");
		coll.insertOne(document_, {w:1}, function(err, result) {
				if (err) {
					handleError(res, err, "Failed to create new "+DocType);
				} else {
					CreateShopCategory(result.ops[0]);
					res.status(201).json(result.ops[0]);
				}
			});
	};

	var CreateShopCategory = function(shopDoc) {
		console.log("posting shop category object");
		var doc={
				level:3,
				shop_id:(shopDoc._id).toString(),
				shopType:shopDoc.shopType,
				images:[],
				category:[]
				};
	
		collShopCategory.insertOne(doc, {w:1}, function(err, result) {
                    if (err) {
                         console.log(err);
                    } else {
                    	console.log(result)
                    }
                });
	};

	/*  "/shops/:id"
	*    GET: find shops by id
	*    PUT: update shops by id
	*    DELETE: deletes shops by id
	*/

	var getDocumentById = function(req, res) {
		var id = new ObjectID(req.params.id);
		console.log('Retrieving document_: ' + id);
		
		var cursor=coll.aggregate([ 
					{
                        "$match": {
                          "_id":id
                        }
                    },
        //            	{
				    //  $addFields: { shop_id: "$_id".toString()}
				   	// },
                   {
				      $lookup:
				         {
				            from:'rating' ,
				            localField: 'shop_id',
				            foreignField: "shop_id",
				            as: "ratings"
				        }
				   },
				   {
				     $addFields: {
				       avgRating: { $avg: "$ratings.rating" } ,
				     }
				   },
				   { $project : {"ratings":0 }  }
			]);

		cursor.toArray(function(err, document_) {
			if (err) {
					handleError(res, err, "Failed to get all "+DocType);
				} else {
					res.status(200).json(document_[0]);
					}	
			});	
	};

	var putDocument = function(req, res) {
		var id = req.params.id;
		var document_ = req.body;
		var objectid=new ObjectID(id);
		document_['_id']=objectid;
		document_['shop_id']=id.toString();
		document_['last_update']=new Date();

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

	var queryDocument = function(req, res) {
		var query = url.parse(req.url, true).query;
		var limit=4;
		if(query['limit']){		
			limit=Number(query['limit']);
			delete query['limit'];
			}
		
		if(query['_id']){
			if(!ObjectID.isValid(query['_id']))
				{res.status(400).json({'count':0,'last_id':0,'results':'invalid id'}); return;}
			query['_id']={$lt:new ObjectID(query['_id'])};
			}
        
		coll.find(query).sort({ '_id': -1 }).limit(limit).toArray(function(err, documents) {
					if (err) {
						handleError(res, err, "Failed to get all "+DocType);
					} else {
						var len=documents.length;
						var last_id="null";
						if(len)last_id = documents[len-1]['_id'];
						res.status(200).json({'count':len,'last_id':last_id,'results':documents});
					}			
				});
	};

	
	var setRating = function(req, res) {
		var cursor=coll.aggregate([ 
					{
				      $lookup:
				         {
				            from:'rating' ,
				            localField: 'shop_id',
				            foreignField: "shop_id",
				            as: "ratings"
				        }
				    },
					{
				     $addFields: {
				       avgRating: { $avg: "$ratings.rating" }
				     }
				   	}
			]);

		cursor.forEach(function(doc) {
			   // console.log(doc._id)	
			    coll.update({_id:doc._id},{$set:{avgRating:doc.avgRating}}); 
			}, function(err) {
			  // done or error
			  res.status(200).json({'response':"done"});
			});
		
	};

	var setStatus = function(req, res) {
		var seller_uid=req.query.seller_uid;
		var status=req.query.status;
		coll.findOneAndUpdate({ "UID": seller_uid},{ "$set": { "status":status } },{returnOriginal:false}, function(err, result) {
				if (err) {
					handleError(res, err, "Failed to create new "+DocType);
				} else {
			  				res.status(200).json({'status':result.value.status});
			  			}
			});	
	};

	var getShopAddress = function(req, res) {
		var id = new ObjectID(req.query.shop_id);
		console.log('Retrieving shop address: ' + id);
		try {
		coll.findOne({'_id':id},{address:1,_id:0}, function(err, document_) {
			console.log(document_);
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

	var getShopAudio = function(req, res) {
		var seller_uid=req.query.seller_uid;
		console.log('Retrieving shop audio: ' + seller_uid);
		
		coll.findOne({ "UID": seller_uid},{audio_message_url:1,_id:0}, function(err, result) {
			if (err) {
				 handleError(res, err, "Failed to get "+DocType+" by id");
			} else {
				res.status(200).json({audio_message_url:result.audio_message_url});
			}
		});
		
	};

	var setShopAudio = function(req, res) {
		var seller_uid=req.query.seller_uid;
		var url=req.query.url;
		coll.findOneAndUpdate({ "UID": seller_uid},{ "$set": { "audio_message_url":url,"last_update": new Date() } },{returnOriginal:false}, function(err, result) {
				if (err) {
					handleError(res, err, "Failed to create new "+DocType);
				} else {
			  				res.status(200).json({'audio_message_url':result.value.audio_message_url});
			  			}
			});		
	};
	
	var getShopImage = function(req, res) {
		var seller_uid=req.query.seller_uid;
		coll.findOne({ "UID": seller_uid},{"shop_image_url":1,_id:0}, function(err, result) {
			if (err) {
				 handleError(res, err, "Failed to get "+DocType+" by id");
			} else {
				res.status(200).json({url:result.shop_image_url});
			}
		});
		
	};

	var getShopKeeperImage = function(req, res) {
		var seller_uid=req.query.seller_uid;
		coll.findOne({ "UID": seller_uid},{"shopkeeper_image_url":1,_id:0}, function(err, result) {
			if (err) {
				 handleError(res, err, "Failed to get "+DocType+" by id");
			} else {
				res.status(200).json({url:result.shopkeeper_image_url});
			}
		});
		
	}; 

	var setShopImage = function(req, res) {
		var seller_uid=req.query.seller_uid;
		var url=req.query.url;
		coll.findOneAndUpdate({ "UID": seller_uid},{ "$set": { "shop_image_url":url ,"last_update": new Date() } },{returnOriginal:false}, function(err, result) {
				if (err) {
					handleError(res, err, "Failed to create new "+DocType);
				} else {
			  				res.status(200).json({'url':result.value.shop_image_url});
			  			}
			});		
	};

	var setShopKeeperImage = function(req, res) {
		var seller_uid=req.query.seller_uid;
		var url=req.query.url;
	
		coll.findOneAndUpdate({ "UID": seller_uid},{ "$set": { "shopkeeper_image_url":url  ,  "last_update": new Date() } },{returnOriginal:false}, function(err, result) {
				if (err) {
					handleError(res, err, "Failed to create new "+DocType);
				} else {
			  				res.status(200).json({'url':result.value.shopkeeper_image_url});
			  			}
			});		
	}

	// documentRouter.get('/unfiltered', getAllDocumentUnFiltered);
	documentRouter.get('/', getAllDocument);
	documentRouter.post('/', postDocument);
	documentRouter.get('/:id', getDocumentById);
	documentRouter.patch('/:id', putDocument);
	documentRouter.put('/:id', putDocument);//change to put
	documentRouter.delete('/:id', deleteDocument);
	documentRouter.get('/query/parameter/',queryDocument);

	// documentRouter.post('/addShopRating/', addShopRating);				
 //    documentRouter.post('/removeShopRating/', removeShopRating); 
 //    documentRouter.post('/getShopRatings/', getShopRatings);

 	documentRouter.post('/paginate', paginateshops);
    documentRouter.post('/updateAllDocument', updateAllDocument);

    documentRouter.post('/address/', getShopAddress);
    documentRouter.post('/getShopAudio/', getShopAudio);
    documentRouter.post('/setShopAudio/', setShopAudio);
    documentRouter.post('/setRating/', setRating);
    documentRouter.post('/setStatus/', setStatus);
    documentRouter.post('/getShopImage/', getShopImage);
    documentRouter.post('/setShopImage/', setShopImage);
    documentRouter.post('/getShopKeeperImage/', getShopKeeperImage);
    documentRouter.post('/setShopKeeperImage/', setShopKeeperImage);

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