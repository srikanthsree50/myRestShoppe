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

	var favShopLimit=8;//no of shops to load on each request
	var favProductLimit=8;//no of products to load on each request
	
	var cartShoplimit=2;//no. of shops to be loaded in each request 
	var cartProductLimit=3;//no of products of each shop to be loaded in cart 

	var cartProductPerShopLimit=5;//no of products to be shown in cart per shop

	
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
		coll.findOne(query ,function(err, documents) {
					if (err) {
						handleError(res, err, "Failed to get all "+DocType);
					} else {
						res.status(200).json(documents);
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

			coll.update(
				    {'_id': new ObjectID(user_id), 'favourite_shops.shop_id': {$ne:shop_id } }, 
				    {$push: { 'favourite_shops': favourite_shop}},
				    function(err, document_) {
												if (err) {
													 handleError(res, err, 'Failed to add favourite product id ' +product_id  + ' to shopid '+shop_id);
												} 
												else {
															res.status(200).json(document_);
														}
								})
			
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

		var limit=Number(req.query.limit);
		if(limit)favShopLimit=limit;

		if(last_time){
				cursor=coll.aggregate([
					{
						"$match": {
						  "_id":user_id
						}
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
						"$match": { "time": { "$lt": new Date(last_time) } }
					},
					{ "$limit": favShopLimit },	
					{
						$group:{
							_id:null,
							shopIDArray:{$push:'$shop_id'},
							last_time: { $last: '$time' }
					   }
					}  
				]);

			}
			else{
				cursor=coll.aggregate([
					{
						"$match": {
						  "_id":user_id
						}
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
					{ "$limit": favShopLimit},	
					{
						$group:{
							_id:null,
							shopIDArray:{$push:'$shop_id'},
							last_time: { $last: '$time' }
					   }
					}  
				]);
			};
	
	   // Get all the aggregation results
		cursor.toArray(function(err, docs) {
				// console.log(docs)
				if(!docs.length){
					res.status(200).json({'count':docs.length,'last_time':'null','results':docs});}
				else
				{       
					var ids=docs[0].shopIDArray;
					var shopids=[];
					for(var i=0;i<ids.length;i++){
						shopids.push(new  ObjectID(ids[i]))	
					}
					// console.log(ids);
					var lt=docs[0].last_time;
					// database.collection('shop').find({"_id":{"$in":ids}}).toArray(function(err, products) {
					// 					console.log(products);
					// 					res.status(200).json({'count':products.length,'last_time':lt,'results':products});
					// 				});

					//bsc avg cant be done in normal find() 
					shopcursor=shopColl.aggregate([
									{	$match: {"_id":{"$in":shopids} } },
							   		{
									     $addFields: {
									       avgRating: { $avg: "$ratings.rating" } ,
									     }
									},
				    				{ $project : {"ratings":0 }  }

								]);

					shopcursor.toArray(function(err, docs) {
							res.status(200).json({'count':docs.length,'last_time':lt,'results':docs});
					});

				}
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

		var limit=Number(req.query.limit);
		if(limit)favProductLimit=limit;

		// console.log(last_time);
		// console.log(user_id);
		var cursor;

		if(last_time){      

			 cursor=coll.aggregate([
				{
					"$match": { "_id":user_id }
				},
				{$unwind:'$favourite_products'},
				{$unwind:'$favourite_products.product'},
				// {
				// 	$match: { "$favourite_products.product.time": { $lt: new Date(last_time) }  }
				// },
				{	$project: {
					"_id":0,
					  "product_id": "$favourite_products.product.product_id", 
					  "time": "$favourite_products.product.time"
				}	},
				{ 	$sort:{'time':-1} 	},
				{
					$match: { "time": { $lt: new Date(last_time) }  }
				},
				{'$limit':favProductLimit},
				{	$group:{
						_id:null,
						productIDArray:{$push:'$product_id'},
						last_time: { $last: '$time' }
				}	}
			]);

		}
		else{
			 cursor=coll.aggregate([
				{
					"$match": { "_id":user_id }
				},
				{$unwind:'$favourite_products'},
				{$unwind:'$favourite_products.product'},
				{$sort:{'favourite_products.product.time':-1}},
				{$project: {
					  "_id":0,
					  "product_id": "$favourite_products.product.product_id", 
					  "time": "$favourite_products.product.time"
				 }} ,
				{"$limit":favProductLimit},
				{	$group:{
					_id:null,
					productIDArray:{$push:'$product_id'},
					//productTimeArray:{$push:'$time'},
					last_time: { $last: '$time' }
				}	}
				// {$project: {
				// 	  "_id":0,
				//       "product_id": "$productIDArray",
				//       "last_time":"$last_time",
				//       "count": {$size: "$productIDArray"}
				//  }}   
				
			]);
		}
	   // Get all the aggregation results
		cursor.toArray(function(err, docs) {
			console.log(docs);
			if(!docs.length){
					res.status(200).json({'count':docs.length,'last_time':'null','results':docs});
			}else{
				// console.log(docs[0].productIDArray);
				var ids=docs[0].productIDArray;
				console.log(ids)

				var productIds=[];
				for(var i=0;i<ids.length;i++){
						productIds.push(new  ObjectID(ids[i]))	
					}

				var lt=docs[0].last_time;
				database.collection('product').find({"_id":{"$in":productIds}}).toArray(function(err, products) {
					console.log(products)
								res.status(200).json({'count':products.length,'last_time':lt,'results':products});

							});
			}
		});
	};

	//in the query we need to pass the user id and shop id 
	var addCartProduct = function(req, res) {
		var user_id = new ObjectID(req.query.user_id);
		var shop_id = req.query.shop_id;
		var shop_name = req.query.shop_name;
		var product_id = req.query.product_id;
		var quantity = Number(req.query.quantity);
		console.log(quantity)
		console.log('adding product id ' +product_id  + ' to cart of shopid '+shop_id);

		productColl.findOne( {'_id':new ObjectID(product_id),'quantity': {'$gte': 0}},{'quantity':1},function(err, result) {//to  check if the total quantity of product is more than 0, else its has become out of stock just now
													if (err) {
														 	console.log(err);
													} 
													else if(result==null){
															console.log("product out of stock");
															res.status(200).json({"response":2}); return;//PRODUCT_NOT_AVAILABLE_IN_STOCK = 2;
													}
													else {
														var recent_quantity_left=result.quantity;
														//product is available check but quanity are decreased so tell him to buy lesser product quantity  
														if(recent_quantity_left<quantity){
															res.status(200).json({"response":3,"remaining_quanity":recent_quantity_left}); return;//PRODUCT_QUANTITY_DECREASED = 3;
														}
														else{//still we have more quantity left out so remove those many quantity from stock
															
															productColl.updateOne(
																 {'_id':new ObjectID(product_id), 'quantity': {'$gte': quantity} },
																 {'$inc': {'quantity': -quantity} },function(err, result) {
																if (err){
																			 	console.log(err);
																		} 
																		else if(result.modifiedCount==1){
																				console.log("product quantity decreased");
																				insertProductToCart(res,user_id,shop_id,shop_name,product_id,quantity);
																		}
																		// else {res.status(200).json({"response":3}); return;//PRODUCT_QUANTITY_DECREASED = 3;
																		// }													
																  });
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
								else{ 
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
														res.status(200).json(document_);
													}
											  });
						}

				}
			});			
		} catch (e){
					handleError(res, e, 'Failed to add cart product');
			}
	}

	var updateCartProductQuantity = function(req, res) {
		var user_id = new ObjectID(req.query.user_id);
		var shop_id = req.query.shop_id;
		var product_id = req.query.product_id;
		var new_required_quantity = Number(req.query.quantity);//new quantity that you want to add to cart
		var cart_quantity = Number(req.query.cart_quantity);//products those were previoslly added to cart
		var latest_stock_quantity;

		//console.log('updating quantity for product id ' +product_id  + ' to cart of shopid '+shop_id);
		console.log("new_required_quantity "+new_required_quantity);
		console.log("cart_quantity "+cart_quantity)
		
		productColl.findOne( {'_id':new ObjectID(product_id),'quantity': {'$gte': 0}},
							 {'quantity':1},function(err, result) {//to  check if the total quantity of product is more than 0, else its has become out of stock just now
													if (err) {
														 	console.log(err);
													} 
													else if(result==null){
															console.log("product out of stock");
															res.status(200).json({"response":2}); return;//PRODUCT_NOT_AVAILABLE_IN_STOCK = 2;
													}
													else {
														latest_stock_quantity=result.quantity;
														console.log("latest_stock_quantity "+latest_stock_quantity)
														//product is available check but quanity are decreased so tell him to buy lesser product quantity  
														
														var addmore=0,removefew=0;

														if(new_required_quantity>cart_quantity)addmore=1;
														else removefew=1;

														console.log("addmore :removefew "+addmore+":"+removefew)

														var net_quantity=0;

														if(addmore){//check if more products can be added or not and then decrease the product quantity
															net_quantity=new_required_quantity- cart_quantity;
															console.log("inside addmore"+net_quantity);
														}

														if(removefew)//if to remove few products then just increase the stock quantity of product
															{ net_quantity=-(cart_quantity- new_required_quantity); 
															console.log("inside removefew"+net_quantity);}

														if(addmore && net_quantity>latest_stock_quantity){
															console.log("net_quantity is more than stock "+net_quantity+": "+latest_stock_quantity)
															res.status(200).json({"response":3,"remaining_quanity":latest_stock_quantity}); return;//PRODUCT_QUANTITY_DECREASED = 3;
														}

														else{//add to remove products based on net_quantity
															productColl.updateOne(
																 {'_id':new ObjectID(product_id), 'quantity': {'$gte': net_quantity} },
																 {'$inc': {'quantity': -net_quantity} },function(err, result) {
																if (err){
																			 	console.log(err);
																		} 
																		else if(result.modifiedCount==1){
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
																							res.status(200).json({"response":4});//PRODUCT_AADDED_TO_CART = 4;
																					});

																				} catch (e){
																							handleError(res, e, 'Failed to update quantity to cart shop id ' +shop_id  + 'to user id'+user_id);
																					}
																		}else{
																			console.log("unknow issue");
																			res.status(200).json(result);return;
																		}
																		// else {res.status(200).json({"response":3}); return;//PRODUCT_QUANTITY_DECREASED = 3;
																		// }													
																  });
														}
													}													
											  });	
			
	};

	//pass the user id , product_id and shop id to remove particular product of a particular shop from a paticular user  
	var removeCartProduct = function(req, res) {
		var user_id = new ObjectID(req.query.user_id);
		var shop_id = req.query.shop_id;
		var product_id = req.query.product_id;
		var quantity = Number(req.query.quantity);

		productColl.updateOne(
				 {'_id':new ObjectID(product_id)},
				 {'$inc': {'quantity': quantity} },
				  function(err, result) {
													if (err) {
														 	console.log(err);
													} 
													else if(result.modifiedCount==1){
															console.log("product quantity decreased");		
															console.log('remove cart product id ' +product_id  + 'of shop_id '+ shop_id +' of user id'+user_id);
												
														try { 
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
			
													}
													else {res.status(200).json({"reason":"failed to increase the quantity by "+quantity +" products"}); return;}													
											  });


	};

	//pass the user id to get the list of cart products
	var getCartProduct = function(req, res) {
		var user_id = new  ObjectID(req.query.user_id);
		var last_time = req.query.last_time;
		var cursor;

		var limit=Number(req.query.limit);
		if(limit)cartShoplimit=limit;

		if(last_time){
			
			cursor=coll.aggregate([
				{
					"$match": {
					  "_id":user_id
					}
				},
				{	
					$project: {	"cart":1	}	
				},
				{$unwind:'$cart'},
				// {$unwind:'$cart.shop'},
				{$sort:{'cart.shop.time':-1}},
				{
					"$match": {
									 "cart.shop.time": { "$lt": new Date(last_time)  } 
							 }
				},
				{"$limit":cartShoplimit},
				{
				 $project:{ "_id":1,"cart":1,numberofproducts:{$size:"$cart.product"}} 
				},
				{	
					$project: {	"_id":0,"shop_id":'$cart.shop.shop_id',"shop_time":'$cart.shop.time',"productcount":"$numberofproducts","shop_product":{ "$reverseArray": { $slice: ['$cart.product'	, -cartProductLimit ] } }	}
					// $project: {	"_id":0,"shop_id":'$cart.shop.shop_id',"shop_time":'$cart.shop.time',"productcount":"$numberofproducts","shop_product":{ $slice: ['$cart.product'	, -cartProductLimit ] } }
				},
				{$unwind:'$shop_product'},
				{
					$group:{
						_id:'$shop_id',
						"shop_time": {"$first":'$shop_time'},
						"productcount":{"$first":"$productcount"},
						product_ids:{$push:'$shop_product.product_id'},
						total:{'$sum':1}	
					}
				},
				{$sort:{'shop_time':-1}}
			]);

		}
		else{
			 cursor=coll.aggregate([
				{
					"$match": {
					  "_id":user_id
					}
				},
				{	
					$project: {	"cart":1	}	
				},
				{$unwind:'$cart'},
				// {$unwind:'$cart.shop'},
				{$sort:{'cart.shop.time':-1}},
				{"$limit":cartShoplimit},
				{
				 $project:{ "_id":1,"cart":1,numberofproducts:{$size:"$cart.product"}} 
				},
				{	
					$project: {	"_id":0,"shop_id":'$cart.shop.shop_id',"shop_time":'$cart.shop.time',"productcount":"$numberofproducts","shop_product":{ "$reverseArray": { $slice: ['$cart.product'	, -cartProductLimit ] } }	}
					// $project: {	"_id":0,"shop_id":'$cart.shop.shop_id',"shop_time":'$cart.shop.time',"productcount":"$numberofproducts","shop_product":{ $slice: ['$cart.product'	, -cartProductLimit ] } }
				},
				{$unwind:'$shop_product'},
				{
					$group:{
						_id:'$shop_id',
						"shop_time": {"$first":'$shop_time'},
						"productcount":{"$first":"$productcount"},
						"product_ids":{	$push: "$shop_product.product_id"},
						total:{	'$sum':1 }
					}
				},
				{$sort:{'shop_time':-1}}
			]);
		}

	   // Get all the aggregation results
		cursor.toArray(function(err, docs) {
			console.log(docs);
			var shopIds=[];
			var productIds=[];
			var counts=[];
			var moreproductcount=[];
			var shopTimes=[];
			docs.forEach(function(value){
  					// console.log(value);
  					shopIds.push(new  ObjectID(value._id));
  					counts.push(value.total);
  					moreproductcount.push(value.productcount-value.total);
  					var ids= value.product_ids;
  					for(var i=0;i<ids.length;i++){
  						productIds.push(new  ObjectID(ids[i]));
  					}
  					shopTimes.push(value.shop_time);

				});

			console.log(shopIds)
			console.log(counts)
			console.log(productIds)
			var lt=shopTimes.slice(-1)[0] ;

			var shops,products;
			var asyncTasks = [];
			asyncTasks.push(function(callback){
				database.collection('shop').aggregate([ { "$match" : { "_id" : { "$in" : shopIds } } },
												{ $project :{category:1,phoneno:1,shop_name:1,shopkepper_name:1,shop_image_url:1,UID:1}},
												{ "$addFields" : { "__order" : { "$indexOfArray" : [ shopIds, "$_id" ] } } },
												{ "$sort" : { "__order" : 1 } }]).toArray(function(err, results) {
									shops=results;
									callback();
								});
			});

			asyncTasks.push(function(callback){
				database.collection('product').aggregate([ { "$match" : { "_id" : { "$in" : productIds } } },
												{ "$addFields" : { "__order" : { "$indexOfArray" : [ productIds, "$_id" ] } } },
												{ "$sort" : { "__order" : 1 } }]).toArray(function(err, results) {
								products=results;
								callback();
							});
			});

			// Now we have an array of functions doing async tasks
			// Execute all async tasks in the asyncTasks array
			async.parallel(asyncTasks, function(){
				  // All tasks are done now
				console.log(shops);
				console.log(products);

				if(shops.length==0 || products.length==0 )
					{res.status(200).json({'count':0,'last_time':"null",'results':[]}); return;}

				var t=0;
				var totalresult=[];
				for(var i=0;i<counts.length;i++){
					var subresults={shops:shops[i],products:products.slice(t,t+counts[i]),"moreproductcount":moreproductcount[i]};	
					console.log(t+" "+(t+counts[i]))
					totalresult.push(subresults);
					t=t+counts[i];
				}

				
				if(counts.length)
					res.status(200).json({'count':docs.length,'last_time':lt,'results':totalresult});
				else 
					res.status(200).json({'count':docs.length,'last_time':"null",'results':totalresult});

			});
		});
	};


	//pass the user id to get the list of cart products of particular shop
	var getCartProductPerShop = function(req, res) {
		var user_id = new  ObjectID(req.query.user_id);
		var shop_id = req.query.shop_id;
		var last_time=req.query.last_time;	

		var limit=Number(req.query.limit);
		if(limit)cartProductPerShopLimit=limit;

		var cursor;

		if(last_time){
				cursor=coll.aggregate([
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
					{	$sort:{'products.time':-1}	},
					{
						"$match": { "products.time": { "$lt": new Date(last_time) } }
					},
					{ "$limit": cartProductPerShopLimit},
					{
						$group:{
							_id:null,
							product_ids:{$push:'$products.product_id'},
							quantities:{$push:'$products.quantity'},
							last_time: { $last: '$products.time' }
					   }
					}  
				]);

			}
			else{
				cursor=coll.aggregate([

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
					{	$sort:{'products.time':-1}	},
					{ "$limit": cartProductPerShopLimit},
					{
						$group:{
							_id:null,
							product_ids:{$push:'$products.product_id'},
							quantities:{$push:'$products.quantity'},
							last_time: { $last: '$products.time' }
					   }
					}  
				]);
			};
	
	   // Get all the aggregation results
		cursor.toArray(function(err, docs) {
				console.log(docs);
				if(!docs.length){
					res.status(200).json({'count':0,'last_time':'null','results':docs});}
				else
				{       
					var ids=docs[0].product_ids;
					var idsObj=[];
					for(var i=0;i<=ids.length;i++){
						idsObj.push(new ObjectID(ids[i]) );	
					}

					var quantities=docs[0].quantities;
					var lt=docs[0].last_time;

					var dict={};

					for(var i=0;i<ids.length;i++){
						dict[ids[i]]=quantities[i];
					}
					
					console.log(dict);
					database.collection('product').aggregate([ { "$match" : { "_id" : { "$in" : idsObj } } },
												{ "$addFields" : { "__order" : { "$indexOfArray" : [ idsObj, "$_id" ] } } },
												{ "$sort" : { "__order" : 1 } }]).toArray(function(err, products) {
												for(var i=0;i<products.length;i++){
													products[i]['cart_quantity']=dict[products[i]['_id']];
												}
												// console.log(products);
												res.status(200).json({'count':products.length,'last_time':lt,'results':products});
							});

					// database.collection('product').find({"_id":{"$in":idsObj}}).toArray(function(err, products) {
					// 					for(var i=0;i<products.length;i++){
					// 							products[i]['quantity']=dict[products[i]['_id']];
					// 						}
					// 						// console.log(products);
					// 					res.status(200).json({'count':products.length,'last_time':lt,'results':products});
					// 				});
				}
			});
	};

	//pass the user id to get the list of cart products of particular shop
	var getProductCartQuantity = function(req, res) {
		var user_id = new  ObjectID(req.query.user_id);
		var shop_id = req.query.shop_id;
		var product_id = req.query.product_id;

			var query={'_id': user_id,'cart.shop.shop_id':shop_id,'cart.product.product_id':product_id};
			cursor=coll.aggregate([
				{
					"$match": {'_id': user_id}}
				},
				{$unwind:'$favourite_products'},
				{$unwind:'$favourite_products.product'},
				{$sort:{'favourite_products.product.time':-1}},
				{$project: {
					  "_id":0,
					  "product_id": "$favourite_products.product.product_id", 
					  "time": "$favourite_products.product.time"
				 }} ,
				{"$limit":favProductLimit},
				{	$group:{
					_id:null,
					productIDArray:{$push:'$product_id'},
					//productTimeArray:{$push:'$time'},
					last_time: { $last: '$time' }
				}	}
				// {$project: {
				// 	  "_id":0,
				//       "product_id": "$productIDArray",
				//       "last_time":"$last_time",
				//       "count": {$size: "$productIDArray"}
				//  }}   
				
			]);
		
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
		var _id = new ObjectID(req.query._id);
		var type = new ObjectID(req.query.type);
		try { 
			var query={'_id': _id};
			if(type=="user"){
			coll.findOne(query,{profile_pic:1}, function(err, document_) {
					if (err) {
						 handleError(res, err, "Failed to get "+DocType+" by id");
					} else {
						res.status(200).json(document_);
					}
				}
			   	);
			}else if(type=="shop"){

				coll.findOne(query,{profile_pic:1}, function(err, document_) {
					if (err) {
						 handleError(res, err, "Failed to get "+DocType+" by id");
					} else {
						res.status(200).json(document_);
					}
				}
			   	);
			}

		} catch (e){
					handleError(res, e, 'Failed to update quantity to cart shop id ' +shop_id  + 'to user id'+user_id);
			}
	};

	documentRouter.get('/', getAllDocument);
	documentRouter.delete('/', removeAllDocuments);
	documentRouter.post('/', postDocument);
	documentRouter.get('/:id', getDocumentById);
	documentRouter.put('/:id', putDocument);//change to put
	documentRouter.delete('/:id', deleteDocument);
	

	documentRouter.get('/query/parameter/',queryDocument);
	documentRouter.get('/query/checkPhoneNo/',checkPhoneNo);
	
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
	documentRouter.post('/profilePic', profilePic);
	documentRouter.post('/getProfilePic', getProfilePic);
 
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