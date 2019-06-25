 // 'use strict'
module.exports = function SetupRouter(CollectionName,CollectionShopName,database,DocType) {
	
	var async = require("async");
	var express = require('express');
	var url = require('url');
	var elastic = require('../elastic/elasticSearch');

	var documentRouter = express.Router();

	var mongodb = require("mongodb");
	var ObjectID = mongodb.ObjectID;
	var coll= database.collection(CollectionName);
	var collShop= database.collection(CollectionShopName);
	var shopColl=database.collection('shop');
	var productColl=database.collection('product');


	/*  "/user"
	*    GET: finds all user
	*    POST: creates a new user
	*/

	var getAllDocument = function(req, res) {
		
		coll.find({}).sort({ '_id': -1 }).toArray(function(err, documents) {
				if (err) {
					handleError(res, err, "Failed to get all "+DocType);
				} else {
					res.status(200).json({'count':documents.length,'results':documents});
					}			
			});
	};

	var removeAllDocuments = function(req, res) {

		console.log("loop came here");
	
		coll.remove({},function(err, result) {

				if (err) {
					console.log( "Failed to clear collection");
				} else {
					console.log( "collection cleared ");
					res.end("collection cleared")				
				}	

			});
	};


	var postDocument = function(req, res) {
		var document_ = req.body;
		document_['last_update_date']= new Date();
		document_['type']= "customer";//explicitly add type to customer schema
		
		//console.log('Adding document_: ' + JSON.stringify(document_));
		coll.insertOne(document_, {w:1}, function(err, result) {
				if (err) {
					handleError(res, err, "Failed to create new "+DocType);
				} else {
					res.status(201).json(result.ops[0]);
				
				}
			});
	};

	
	/*  "/user/:id"
	*    GET: find user by id
	*    PUT: update user by id
	*    DELETE: deletes user by id
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



	var last_id=1;
	var pagesize=12;
	var count=0;

	
	var queryDocument = function(req, res) {
		// var name = req.query.name;
		var query = url.parse(req.url, true).query;
		var pageno = req.params.pageno;

		if(query['_id']){
			if(!ObjectID.isValid(query['_id']))
				{res.status(400).json({'count':0,'last_id':0,'results':'invalid id'}); return;}
			query['_id']={$lt:new ObjectID(query['_id'])};
			}

			// if(query['age'])query['age']=parseInt(query['age']);
			// console.log(query);
		coll.find(query).sort({ '_id': -1 }).limit(pagesize).toArray(function(err, documents) {
					if (err) {
						handleError(res, err, "Failed to get all "+DocType);
					} else {
						var len=documents.length;
						if(len)last_id = documents[len-1]['_id'];
						res.status(200).json({'count':documents.length,'last_id':last_id,'results':documents});
					}			
				});
	};

	var checkPhoneNo = function(req, res) {
		var query = url.parse(req.url, true).query;
		console.log(query)
		coll.findOne(query,{_id:1,fcm_token:1,firebase_uid:1,name:1,phone_no:1,profile_pic:1} ,function(err, documents) {
					if (err) {
						handleError(res, err, "Failed to get all "+DocType);
					} else {
						res.status(200).json(documents);
					}			
				});
	};

	var setFirebaseDetails = function(req, res) {
		var user_id = new ObjectID(req.query._id);
		var fcm_token=req.query.fcm_token;
		var firebase_uid=req.query.firebase_uid;
		var name=req.query.name;

		coll.findOneAndUpdate(
			   { 	_id: user_id },
			   {
					$addToSet: {fcm_token: fcm_token } ,
					$set: {	firebase_uid: firebase_uid,	name:name  } 
			   },
			   { projection:{fcm_token:1,firebase_uid:1,name:1,phone_no:1,profile_pic:1 },new: true },	
			   function(err, documents) {
					if (err) {
						handleError(res, err, "Failed to get all "+DocType);
					} else {
						res.status(200).json(documents.value);
					}			
				});
	};

	//in the query we need to pass the user id and shop id 
	var addFavouriteShop = function(req, res) {
		var user_id = req.query.user_id;
		var shop_id = req.query.shop_id;

		console.log('inserting favourite shop id ' +shop_id  + ' to user id'+user_id);
	
		try { 
			var favourite_shop={'shop_id':shop_id,'time':new Date()};
			var query={'_id': new ObjectID(user_id)};
			
			// coll.findOneAndUpdate(query, { $addToSet: { 'favourite_shops': favourite_shop } },function(err, document_) {
			// 									if (err) {
			// 										 handleError(res, err, 'Failed to add favourite product id ' +product_id  + ' to shopid '+shop_id);
			// 									} 
			// 									else {
			// 												res.status(200).json(document_);
			// 											}
			// 					});

			coll.update( {'_id': new ObjectID(user_id), 'favourite_shops.shop_id': {$ne:shop_id } }, 
				    {$push: { 'favourite_shops': favourite_shop}},
				    function(err, document_) {
												if (err) {
													 handleError(res, err, 'Failed to add favourite product id ' +product_id  + ' to shopid '+shop_id);
												} 
												else {
															res.status(200).json(document_);
														}
								});
			
		} catch (e){
					handleError(res, e, 'Failed to inserting favourite shop id ' +shop_id  + 'to user id'+user_id);
				   }
	};

	//pass the user id and shop id to remove particular shop from paticular user  
	var removeFavouriteShop = function(req, res) {
		var user_id = new ObjectID(req.query.user_id.toString());
		var shop_id = req.query.shop_id.toString();
	
		console.log('remove favourite shop id ' +shop_id  + ' to user id'+user_id);

		try { 
			coll.updateOne({ '_id':user_id,'favourite_shops.shop_id':shop_id },
						{ $pull: { 'favourite_shops': {'shop_id': shop_id } } },
				 function(err, document_) {
					if (err) {
						 handleError(res, err, "Failed to get "+DocType+" by id");
					} else {
						res.status(200).json(document_);
					}
				});
		} catch (e){
					handleError(res, e, 'Failed to remove favourite shop id ' +shop_id  + 'to user id'+user_id);
			}
	};

	//pass the user id to get the list of favourite shops
	var getFavouriteShop = function(req, res) {
		var user_id = new  ObjectID(req.query.user_id);
		var last_time=req.query.last_time;		
		var cursor;
		var shopcursor;

		var favShopLimit=8;//no of shops to load on each request
		var limit=Number(req.query.limit);
		if(limit)favShopLimit=limit;

		var condition={};
		if(last_time) condition["time"]={ "$lt": new Date(last_time) } ;
		
		cursor=coll.aggregate([
			{
				"$match": {
				  "_id":user_id
				}
			},
			{
				'$project':{favourite_shops:1}	
			},
			{	$unwind:'$favourite_shops'	},
			{	
				$project: {
				"_id":0,
			  	"shop_id": "$favourite_shops.shop_id", 
			  	"time": "$favourite_shops.time"
				}	
			},
			{	$sort:{'time':-1}	}, // order by time. 1=ascending | -1=descending 
			{
				"$match":condition
			},
			{ "$limit": favShopLimit },	
			{
	              $lookup:
	                {
	                    from:'shop' ,
	                    localField: 'shop_id',
	                    foreignField: "shop_id",
	                    as: "shop"
	                }
            },
            { $match: {shop: {$ne: []}} },
            {
		      $lookup:
		         {
		            from:'shopCategory' ,
		            localField: 'shop_id',
		            foreignField: "shop_id",
		            as: "shopCategory"
		        }
		    },
            { "$addFields": { "shop.product_images": { $arrayElemAt: ["$shopCategory.images",0] }  ,"shop.time": "$time"} },
            { 	$project : {'shopCategory':0}  },
            { "$replaceRoot": { "newRoot": { $arrayElemAt: [ "$shop", 0 ] } }  }       
			
		]);

		cursor.toArray(function(err, docs) {
				var len=docs.length;
                var last_time="null";
                if(docs.length) last_time=docs[len-1].time;        
                res.status(200).json({'count':docs.length,'last_time':last_time,'results':docs});
			});
	};



	//in the query we need to pass the user id and shop id 
	var addFavouriteProduct = function(req, res) {
		var user_id = new ObjectID(req.query.user_id);
		var shop_id = req.query.shop_id;
		var product_id = req.query.product_id;

		console.log('adding favourite product id ' +product_id  + ' to shopid '+shop_id);
		
		try { 
			var t=new Date(); 

			var query={'_id': user_id,'favourite_products.shop.shop_id':shop_id};
			
			var product={'product_id': product_id,'time':t};
			
			var subFavourite={  'shop':{'shop_id': shop_id,time:t}, 
								'product':[{'product_id': product_id,time:t}]
							 };

			coll.findOneAndUpdate(query, { $push: { 'favourite_products.$.product': product },"$set": { 'favourite_products.$.shop.time' :t  } },function(err, document_) {
												if (err) {
													 handleError(res, err, 'Failed to add favourite product id ' +product_id  + ' to shopid '+shop_id);
												} 
												else {
														 if(document_.value==null){// if shop id not present
														
															coll.updateOne({'_id':user_id},{ $addToSet: { 'favourite_products': subFavourite} },{upsert:true, w: 1}, function(err, document_) {
																	if (err) {
																		 handleError(res, err, 'Failed to add favourite product id ' +product_id  + ' to shopid '+shop_id);
																	} else {
																		res.status(200).json(document_);
																	}
															  });

														}else{//shop id already exists so just add the product id under that shop id
															res.status(200).json(document_);
														}

												}
										  });
			
		} catch (e){
					handleError(res, e, 'Failed to inserting favourite shop id ' +shop_id  + 'to user id'+user_id);
			}
	};

	//pass the user id , product_id and shop id to remove particular product of a particular shop from a paticular user  
	var removeFavouriteProduct = function(req, res) {
		var user_id = new ObjectID(req.query.user_id);
		var shop_id = req.query.shop_id;
		var product_id = req.query.product_id;

		console.log('remove favourite product id ' +product_id  + 'of shop_id '+ shop_id +' of user id'+user_id);
		try { 
			coll.findOneAndUpdate({ '_id': user_id,'favourite_products.shop.shop_id':shop_id },
				{  $pull: { 'favourite_products.$.product':{'product_id': product_id } } }, function(err, document_) {
				if (err) {
					 handleError(res, err, "Failed to get "+DocType+" by id");
				} else {
					res.status(200).json(document_);
				}
			});
		} catch (e){
					handleError(res, e, 'Failed to remove favourite product id ' +product_id  + 'of shop_id ' +shop_id +' of user id'+user_id);
			}
	};
	 
	//pass the user id to get the list of favourite products
	var getFavouriteProduct = function(req, res) {
		var user_id = new  ObjectID(req.query.user_id);
		var last_time = req.query.last_time;

		var favProductLimit=8;//no of products to load on each request
		var limit=Number(req.query.limit);
		if(limit)favProductLimit=limit;

		var condition={};
		if(last_time) condition["time"]={ "$lt": new Date(last_time) } ;

		// console.log(last_time);
		// console.log(user_id);
		var cursor=coll.aggregate([
				{
					"$match": { "_id":user_id }
				},
				{$unwind:'$favourite_products'},
				{$unwind:'$favourite_products.product'},
				{	$project: {
					"_id":0,
					  "product_id": "$favourite_products.product.product_id", 
					  "time": "$favourite_products.product.time"
				}	},
				{ 	$sort:{'time':-1} 	},
				{
					$match: condition
				},
				{'$limit':favProductLimit},
				{
                      $lookup:
                         {
                            from:'product' ,
                            localField: 'product_id',
                            foreignField: "product_id",
                            as: "product"
                        }
                },       
                { $match: {product: {$ne: []}} },
                { "$addFields": { "product.time": "$time" } },
            	{ "$replaceRoot": { "newRoot": { $arrayElemAt: [ "$product", 0 ] } }  }       
                
			]);
		
	   // Get all the aggregation results
		cursor.toArray(function(err, docs) {
			var len=docs.length;
            var last_time="null";
            if(docs.length) last_time=docs[len-1].time;        
            res.status(200).json({'count':len,'last_time':last_time,'results':docs});
		});
	};

	//in the query we need to pass the user id and shop id 
	var addCartProduct = function(req, res) {
		var user_id = new ObjectID(req.query.user_id);
		var shop_id = req.query.shop_id;
		var shop_name = req.query.shop_name;
		var product_id = req.query.product_id;
		var required_quantity = Number(req.query.quantity);
		var action=req.query.action;
		
		console.log('adding product id ' +product_id  + ' to cart of shopid '+shop_id);

		productColl.findOne( {'_id':new ObjectID(product_id),'quantity': {'$gt': 0}},{'quantity':1},function(err, result) {//to  check if the total quantity of product  in product collection is more than 0, else its has become out of stock just now
													if (err) {
														 	console.log(err);
													} 
													else if(result==null){
															console.log("product out of stock");
															res.status(200).json({"response":2}); return;//PRODUCT_NOT_AVAILABLE_IN_STOCK = 2;
													}
													else {
														var stock_quantity_left=result.quantity;

														if(action=="insert"){

																console.log("insert cart");
																if(stock_quantity_left<required_quantity){//product is available check but quanity is decreased so tell user to select from lesser product quantity  
																		res.status(200).json({"response":3,"remaining_quantity":stock_quantity_left}); //PRODUCT_QUANTITY_DECREASED = 3;
																}
																else{//still we have more quantity left out so add those many quantity to cart
																		insertProductToCart(res,user_id,shop_id,shop_name,product_id,required_quantity);				
																}

															}
															else if (action=="update"){
												
																if(stock_quantity_left<required_quantity){
																	updateCartProductQuantity(res,user_id,shop_id,product_id,stock_quantity_left,3);//PRODUCT_QUANTITY_DECREASED = 3;
																}else{//still we have more quantity left out so remove those many quantity from stock
																	updateCartProductQuantity(res,user_id,shop_id,product_id,required_quantity,4); //PRODUCT_AADDED_TO_CART = 4;			
																}

															}
													}													
											  });
		
	};

	var insertProductToCart=function(res,user_id,shop_id,shop_name,product_id,quantity){

		try {

			var t=new Date(); 

			var query_product={'_id': user_id,'cart.shop.shop_id':shop_id,'cart.product.product_id':product_id};

			var query_shop={'_id': user_id,'cart.shop.shop_id':shop_id};
			
			var product={'product_id':product_id,'quantity':quantity,'time':t};
			
			var subCart={  'shop':{'shop_id': shop_id,'shop_name':shop_name,time:t}, 
						   'product':[product]
						};
			coll.findOne(query_shop,function(err, documentShop) {//check if the shop exists
				if (err) handleError(res, err, 'Failed to add cart product');
				else {	
						console.log(query_shop);
						console.log("documentShop "+documentShop);	
						 if(documentShop!=null){// if shop is present then check if the product is present
							console.log("if shop is present then check if the product is present");

						 	coll.findOne(query_product,function(err, documentProduct) {//check if the product exists
								if (err) handleError(res, err, 'Failed to add cart product');
								else
								{

									if(documentProduct!=null)//if product is present then update the quantity and time in product
									{	
										console.log("if product is present then update the quantity and time in product");
										var bulk = coll.initializeOrderedBulkOp();
										bulk.find(query_product).updateOne({ "$pull": { 'cart.$.product':{'product_id': product_id } } });
										bulk.find(query_shop).updateOne({ "$addToSet": { "cart.$.product":  product },"$set": { 'cart.$.shop.time' :t  } });
										
										bulk.execute(function(err, document_) {
											if (err) 
												 handleError(res, err, 'Failed to add cart product');
											else 
												// res.status(200).json(document_); 
												res.status(200).json({"response":4});//PRODUCT_AADDED_TO_CART = 4;
										});
									}
									else{//shop exists but product does not so insert product
										console.log("shop exists but product does not so insert product");
										var bulk = coll.initializeOrderedBulkOp();
										bulk.find(query_shop).updateOne({ "$addToSet": { "cart.$.product":  product },"$set": { 'cart.$.shop.time' :t  } });
		
										bulk.execute(function(err, document_) {
											if (err) 
												 handleError(res, err, 'Failed to add cart product');
											else 
												// res.status(200).json(document_);
											res.status(200).json({"response":4});//PRODUCT_AADDED_TO_CART = 4;
										});
									}
								}
							});
				
						}else{//shop does not exist then insert new shop and product into it
							console.log("shop does not exist then insert new shop and product into it");
							coll.updateOne({'_id':user_id},{ $addToSet: { 'cart': subCart} },{upsert:true, w: 1}, function(err, document_) {
													if (err) {
														 handleError(res, err, 'Failed to add cart product ');
													} else {
														res.status(200).json({"response":4});//PRODUCT_AADDED_TO_CART = 4;
													}
											  });
						}

				}
			});			
		} catch (e){
					handleError(res, e, 'Failed to add cart product');
			}
	}
    var updateCartProductQuantity=function(res,user_id,shop_id,product_id,new_required_quantity,response_no)
	{
		console.log("product quantity decreased/increased");
		try { 
			var t=new Date(); 

			var query={'_id': user_id,'cart.shop.shop_id':shop_id,'cart.product.product_id':product_id};
			var query1={'_id': user_id,'cart.shop.shop_id':shop_id};

			var product={'product_id':product_id,'quantity':new_required_quantity,'time':t};
			console.log("after update is done update cart"+new_required_quantity)
			var bulk = coll.initializeOrderedBulkOp();
			bulk.find(query).updateOne({ "$pull": { 'cart.$.product':{'product_id': product_id} } });
			bulk.find(query1).updateOne({ "$addToSet": { "cart.$.product":  product } ,"$set": { 'cart.$.shop.time' :t  }});

			bulk.execute(function(err, document_) {
				if (err) 
					 handleError(res, err, 'Failed to add cart product');
				else 
					if(response_no==4)
						res.status(200).json({"response":4});//PRODUCT_AADDED_TO_CART = 4;
					else if(response_no==3)
						res.status(200).json({"response":3,"remaining_quanity":new_required_quantity}); return;//PRODUCT_QUANTITY_DECREASED = 3;
			});

		} catch (e){
					handleError(res, e, 'Failed to update quantity to cart shop id ' +shop_id  + 'to user id'+user_id);
			}	
	}
	
	//pass the user id , product_id and shop id to remove particular product of a particular shop from a paticular user  
	var removeCartProduct = function(req, res) {
		var user_id = new ObjectID(req.query.user_id);
		var shop_id = req.query.shop_id;
		var product_id = req.query.product_id;
		var quantity = Number(req.query.quantity);

		try { 
			console.log('remove cart product id ' +product_id  + 'of shop_id '+ shop_id +' of user id'+user_id);
			coll.findOneAndUpdate({ '_id': user_id,'cart.shop.shop_id':shop_id },
				{ $pull: { 'cart.$.product':{'product_id': product_id } } }, function(err, document_) {
				if (err) {
					 handleError(res, err, "Failed to get "+DocType+" by id");
				} else {
					res.status(200).json(document_);
				}
			});
		} catch (e){
					handleError(res, e, 'Failed to remove favourite product id ' +product_id  + 'of shop_id ' +shop_id +' of user id'+user_id);
			}
	};

	//pass the user id to get the list of cart products
	var getCartProduct = function(req, res) {
		var user_id = new  ObjectID(req.query.user_id);
		var last_time = req.query.last_time;
		var cursor;

		var cartShoplimit=3;//no. of shops to be loaded in each request 
		var cartProductLimit=3;//no of products of each shop to be loaded in cart 
		var limit=Number(req.query.limit);
		if(limit)cartShoplimit=limit;

		var condition={};
		if(last_time) condition["cart.shop.time"]={ "$lt": new Date(last_time) } ;
		console.log(condition)
		cursor=coll.aggregate([
			{	"$match": { "_id":user_id }  },
			{	
				$project: {	"cart":1	}	
			},
			{	$unwind:'$cart'		},
			{
				"$match": condition
			},
			{	$sort:{'cart.shop.time':-1}		},
			{	
				$project: {	"_id":0,"shop_id":'$cart.shop.shop_id',"shop_time":'$cart.shop.time',"total":{$size:"$cart.product"},"shop_product":{ "$reverseArray": { $slice: ['$cart.product'	, -cartProductLimit ] } }	}
			},
			{$unwind:'$shop_product'},
			{
                      $lookup:
                         {
                            from:'product' ,
                            localField: 'shop_product.product_id',
                            foreignField: "product_id",
                            as: "product"
                        }
            }, 
            { $match: {product: {$ne: []}} },  
			{
					$group:{
						_id:'$shop_id',
						"shop_time": {"$first":'$shop_time'},
						"total":{"$first":"$total"},
						 product_images:{$push:{ $arrayElemAt: [ "$product.imageid", 0 ] } }
					}
			},
			{
                    $lookup:{
                        from:'shop' ,
                        localField: '_id',
                        foreignField: "shop_id",
                        as: "shop"
                    }
            },       
            {	$match: {shop: {$ne: []}} },
            {	"$limit":cartShoplimit 	},
	        {	$project: 
	            	{ 
	            		shop_time:1,total:1,product_images:1, shop : {  $arrayElemAt: [ "$shop", 0 ] } 
	            	} 
            },
            { $project: 
            	{ 
            		shop:{_id:1, category:1,phoneno:1,shop_name:1,shopkepper_name:1,shop_image_url:1,UID:1,min_order:1,isMinimumOrder:1,status:1} , shop_time:1,total:1,product_images:1 
            	}
            },
			{$sort:{'shop_time':-1}}
		]);

	   // Get all the aggregation results
		cursor.toArray(function(err, docs) {
			var len=docs.length;
            var last_time="null";
            if(docs.length) last_time=docs[len-1].shop_time;        
            res.status(200).json({'count':docs.length,'last_time':last_time,'results':docs});
		});
	};

	//pass the user id to get the list of cart products of particular shop
	var getCartProductPerShop = function(req, res) {
		var user_id = new  ObjectID(req.query.user_id);
		var shop_id = req.query.shop_id;
		var last_time=req.query.last_time;	

		var cartProductPerShopLimit=5;//no of products to be shown in cart per shop
		var limit=Number(req.query.limit);
		if(limit)cartProductPerShopLimit=limit;

		var condition={};
		if(last_time) condition["products.time"]={ "$lt": new Date(last_time) } ;

		var totalAmount=[
								{
			                      $lookup:
			                         {
			                            from:'product' ,
			                            localField: 'products.product_id',
			                            foreignField: "product_id",
			                            as: "product"
			                        }
			            		}, 
			            		{ $unwind: '$product'},
			            		{
			            			$project:{ quantity:'$products.quantity',mrp: '$product.mrp' }
			            		},
			            		{
							      $group:
							         {
							           _id: null,
							           totalAmount: { $sum: { $multiply: [ "$quantity", "$mrp" ] } }
							         }
							    }
						];

		var products=[
								{	$sort:{'products.time':-1}	},
								{
									"$match": condition
								},
								{ "$limit": cartProductPerShopLimit},
								{
			                      $lookup:
			                         {
			                            from:'product' ,
			                            localField: 'products.product_id',
			                            foreignField: "product_id",
			                            as: "product"
			                        }
			            		},
			            		{  $match: {product: {$ne: []}} },
				                { "$addFields": { "product.time": "$products.time" } },
				                { "$addFields": { "product.cart_quantity": "$products.quantity" } },
				            	{ "$replaceRoot": { "newRoot": { $arrayElemAt: [ "$product", 0 ] } }  }   
				   ];

		var facet;
		if(!last_time)
			facet={	"totalAmount":totalAmount,	"products":products   }
		else 
			facet={"products":products   }
        		 
		var cursor=coll.aggregate([

				        		        {
											"$match": {
											  "_id":user_id
											}
										},
										{	
										    $project: {	"cart":1	}	
									    },
										{	$unwind:'$cart'	},
										{
											"$match": {
											  "cart.shop.shop_id":shop_id
											}
										},
										{	
											$project: {"_id":0, "products":"$cart.product"	}	
										},	
										{	$unwind:'$products'},
										{ 	
											$facet: facet 
						        		}
			 					 ]);

	   // Get all the aggregation results
		cursor.toArray(function(err, docs) {
				var len=docs.length;
	            var last_time="null";
	            if(docs.length==0)   
	            	 res.status(200).json({'count':0,amount:0,'last_time':0,'results':[]});
	            else{

	            	var totalAmount=-1;
	            	if(docs[0].totalAmount)totalAmount=docs[0].totalAmount[0].totalAmount;
		            var products=docs[0].products;
		            len=products.length;
		            if(products.length)last_time=products[len-1].time;     
		            res.status(200).json({'count':len,amount:totalAmount,'last_time':last_time,'results':products});
		            // res.status(200).json({'results':docs,'last_time':last_time});

	            }	
	            
			});
	};

	//pass the user id to get the list of cart products of particular shop
	var getCartAmountPerShop = function(req, res) {
		var user_id = new  ObjectID(req.query.user_id);
		var shop_id = req.query.shop_id;

		var cursor=coll.aggregate([
					{
						"$match": {
						  "_id":user_id
						}
					},
					{	
					    $project: {	"cart":1	}	
				    },
					{	$unwind:'$cart'	},
					{
						"$match": {
						  "cart.shop.shop_id":shop_id
						}
					},
					{	
						$project: {"_id":0, "products":"$cart.product"	}	
					},
					{ $unwind: '$products'},
					{
                      $lookup:
                         {
                            from:'product' ,
                            localField: 'products.product_id',
                            foreignField: "product_id",
                            as: "product"
                        }
            		}, 
            		{ $unwind: '$product'},
            		{
            			$project:{ quantity:'$products.quantity',mrp: '$product.mrp' }
            		},
            		{
				      $group:
				         {
				           _id: null,
				           totalAmount: { $sum: { $multiply: [ "$quantity", "$mrp" ] } }
				         }
				    }
				]);
		
	   // Get all the aggregation results
		cursor.toArray(function(err, docs) {
				var totalAmount=0;
				if(docs.length)totalAmount=docs[0].totalAmount;
				res.status(200).json({'amount':totalAmount});
			});
	};

	//pass the user id to get the list of cart products of particular shop
	var checkProductCartQuantity = function(req, res) {
		var user_id = new  ObjectID(req.query.user_id);
		var shop_id = req.query.shop_id;
		var product_id = req.query.product_id;

			//var query={'_id': user_id,'cart.shop.shop_id':shop_id,'cart.product.product_id':product_id};
			var cursor=coll.aggregate([
				{
					"$match": {'_id': user_id}
				},
				{	
					    $project: {	"_id":0,"cart":1	}	
				},
				{	$unwind:'$cart'	},
				{
						"$match": {
						  "cart.shop.shop_id":shop_id
						}
				},	
				{	$unwind:'$cart.product'},
				{
						"$match": {
						  "cart.product.product_id":product_id
						}
				},
				{	
					    $project: {	"_id":0,"quantity":"$cart.product.quantity"	}	
				},
			]);

			cursor.toArray(function(err, docs) {
				console.log(docs);
				if(!docs.length){
						res.status(200).json({'response':5});//PRODUCT_WAS_NOT_ADDED_TO_CART = "5";
				}else{
					res.status(200).json({'response':6,"cart_quantity":Number(docs[0].quantity)});//PRODUCT_WAS_ADDED_TO_CART = "6";
				}
			});

	};

	//pass the user id to get the list of cart products of particular shop
	var getCartCount = function(req, res) {
		var user_id = new  ObjectID(req.query.user_id);

		var cursor=coll.aggregate([
				{
					"$match": {'_id': user_id}
				},
				{	
					    $project: {	"_id":0,"cart":1	}	
				},
				{	$unwind:'$cart'	},
				{	
					    $project: {'cart.product':1 }	
				},
				{
			       $group:
			         {
			           _id: null,
			           count: { $sum: { $size: "$cart.product" } },
			         }
			     }
			]);

			cursor.toArray(function(err, docs) {
				// console.log(docs);
				// res.status(200).json(docs); return ;
				if(!docs.length){
						res.status(200).json({'response':0,'count':0});//'response':0 means document with user_id not found
				}else{
					res.status(200).json({'response':1,"count":Number(docs[0].count)});//'response':1 means success
				}
			});

	};

	
	var profilePic = function(req, res) {
		var user_id = new ObjectID(req.query.user_id);
		var profile_pic= req.query.profile_pic;
		https://shoploapi.herokuapp.com/user/profilePic?user_id=59b40458b2ec750004cda807&profilePic=uSkO2QuZAacD3OZXQbLYUgtQd.webp  
		console.log('add a new profile ' +user_id );
		console.log('profile name'+ profile_pic)
		
		try { 

			var query={'_id': user_id};
			
			database.collection('user').update(
		      query,
		      { $set:  { "profile_pic" : profile_pic} }, function(err, document_) {
				if (err) {
					 handleError(res, err, "Failed to get "+DocType+" by id");
				} else {
					res.status(200).json(document_);
				}
			}
		   	);

		} catch (e){
					handleError(res, e, 'Failed to update quantity to cart shop id ' +shop_id  + 'to user id'+user_id);
			}
	};

	var getProfilePic = function(req, res) {
		var _id = new ObjectID(req.query.user_id);
		var type=req.query.type;
		var projection;
		var query={'_id': _id};

		if(type=="own")
			projection={profile_pic:1};
		else if(type=="others")
			projection={profile_pic:1,name:1,phone_no:1,_id:1}

		try { 
			
			coll.findOne(query,projection, function(err, document_) {
					if (err) {
						 handleError(res, err, "Failed to get "+DocType+" by id");
					} else {
						res.status(200).json(document_);
					}
				});
			}catch (e){
					handleError(res, e, 'Failed to update quantity to cart shop id ' +shop_id  + 'to user id'+user_id);
			}
	};

	// var removeEmptyFavouriteProducts = function(req, res) {
	
	// 	console.log('removeing Empty Favourite Products');

	// 	try { 
	// 		coll.updateMany({},{ $pull: { 'favourite_products': {product: []} } },
	// 			 function(err, document_) {
	// 				if (err) {
	// 					 handleError(res, err, "Failed to get "+DocType+" by id");
	// 				} else {
	// 					res.status(200).json(document_);
	// 				}
	// 			});
	// 	} catch (e){
	// 				handleError(res, e, 'Failed to removeEmptyFavouriteProducts');
	// 		}
	// };


	documentRouter.get('/', getAllDocument);
	documentRouter.delete('/', removeAllDocuments);
	documentRouter.post('/', postDocument);
	documentRouter.get('/:id', getDocumentById);
	documentRouter.put('/:id', putDocument);//change to put
	documentRouter.delete('/:id', deleteDocument);
	

	documentRouter.get('/query/parameter/',queryDocument);
	documentRouter.get('/query/checkPhoneNo/',checkPhoneNo);
	documentRouter.post('/setFirebaseDetails',setFirebaseDetails);
	
	documentRouter.post('/addFavouriteShop', addFavouriteShop);
	documentRouter.post('/removeFavouriteShop', removeFavouriteShop); 
	documentRouter.post('/getFavouriteShop', getFavouriteShop);

	documentRouter.post('/addFavouriteProduct', addFavouriteProduct);
	documentRouter.post('/removeFavouriteProduct', removeFavouriteProduct);
	documentRouter.post('/getFavouriteProduct', getFavouriteProduct);

	documentRouter.post('/addCartProduct', addCartProduct);
	documentRouter.post('/updateCartProductQuantity', updateCartProductQuantity);
	documentRouter.post('/removeCartProduct', removeCartProduct);
	documentRouter.post('/getCartProduct', getCartProduct); 
	documentRouter.post('/getCartProductPerShop', getCartProductPerShop); 
	documentRouter.post('/checkProductCartQuantity', checkProductCartQuantity);
	documentRouter.post('/getCartAmountPerShop', getCartAmountPerShop);
	documentRouter.post('/getCartCount', getCartCount);

	documentRouter.post('/profilePic', profilePic);
	documentRouter.post('/getProfilePic', getProfilePic);

	//scripts
	//documentRouter.post('/removeEmptyFavouriteProducts', removeEmptyFavouriteProducts);
	
 
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