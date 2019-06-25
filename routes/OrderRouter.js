// 'use strict'
module.exports = function SetupRouter(CollectionName,SellerCollectionName,UserCollectionName,database,DocType) {

	var FCM = require('fcm-node');
	var seller_server_key = "AAAAR7t6afg:APA91bF9_Q7rcOZ-jTaIJg4derosIl8FsijniL40WVdMo10V-rB23Rz5-Sy2LgUYLLxc2_Q5JFVT8a_QTFhHaA88KPxkF4B-7NsByn_MwKjqPyq8MAZjRDOY7Og23WVKFQFrunGYyyeW"
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
	var seller_coll = database.collection(SellerCollectionName);
	var user_coll = database.collection(UserCollectionName);

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


	var filterDocuments = function(req, res) {

		var order_status = req.params.order_status;
		console.log(order_status);
		
		coll.find({"order_status":order_status}).toArray(function(err, documents) {
				if (err) {
					handleError(res, err, "Failed to get all "+DocType);
				} else {
					res.status(200).json({'count':documents.length,'results':documents});
					}			
			});
	};


	var sendSellerNotif = function(seller_uid,message){

			console.log("uid ",seller_uid)
			console.log("message ",message)
				
		   seller_coll.findOne({'UID':seller_uid}, { 'fcm_token':1},function (err,user) {     

              if(err){
                console.log(res,err);
              }else {
                if(user!=null){
                    for(i =0;i<user.fcm_token.length;i++){

                      var token=user.fcm_token[i];

                      console.log("token no "+i+" "+token);

                      var msg = {
                        "data": message,
                        to: token,
                        content_available: true,
                        priority: "high"
                      };

                      console.log(msg)

                      seller_fcm.send(msg,function(err,response){
                      	if(err){
                      		console.log(err)
                      	}else{
                      		console.log("notif sent")
                      	}
                      })
                            
                  }


                }
                 else {
                      console.log("can't find the specific seller when trying to post order");
                      }  
              }
        });
	}

	//pass the user id to get the list of cart products of particular shop
	var PostOrder = function(req, res) {
		var user_id = req.query.user_id;
		var user_address_id = req.query.user_address_id;
		var user_name = req.query.user_name;
		var shop_id = req.query.shop_id;
		var seller_uid = req.query.seller_uid;
		var shop_image=req.query.shop_image;
		var user_image = req.query.user_image;
		var user_number = req.query.user_number;

		var cursor=database.collection('user').aggregate([
					{
						"$match": {
						  "_id":new  ObjectID(user_id)
						}
					},
					{	
					    $project: {	"cart":1}	
				    },
				    {$unwind:'$cart'},
				    {
						"$match": {
						  'cart.shop.shop_id':shop_id
						}
					},
					{	
					    $project: {	_id:0,"products":"$cart.product","shop_name":'$cart.shop.shop_name' }	
				    },
				]);

	
	   // Get all the aggregation results
		cursor.toArray(function(err, docs) {
				// console.log(docs[0].products.length);
				
				var productinfo=docs[0].products;
				var shop_name=docs[0].shop_name;
				var productIds=[]; //,productQuantity=[];
				
				var dict = {}; // create an empty dictionary

				for(var i=0;i<productinfo.length;i++){
					// console.log(productinfo[i]);
					productIds.push(new ObjectID (productinfo[i].product_id));
					dict[productinfo[i].product_id]=productinfo[i].quantity;
				}
				
				// console.log(productId)
				// console.log(dict)

				var productInfo=[];
				
				database.collection('product').find({"_id":{"$in":productIds}},{mrp:1,name:1,imageid:1,quantity:1,category:1}).toArray(function(err, results) {
									// console.log("results "+results);
									// var results=results[0];
									// console.log("results "+results)
									var total=0,actual_amount=0;
									var bulk = database.collection('product').initializeOrderedBulkOp();
									var bulkupdate = database.collection('user').initializeOrderedBulkOp();
									
									var response=[];
									var orderconflict=false;
									var totalproduct=results.length;
									for(var i=0;i<totalproduct;i++)
									{
										var product_id=results[i]._id.toString();
										var mrp=results[i].mrp;
										var cart_quantity=Number(dict[product_id]);
										var name=results[i].name;
										var imageid=results[i].imageid;
										var stock_quantity=Number(results[i].quantity);
										var category=results[i].category;
										
										var t=new Date(); 
										var query={'_id': user_id,'cart.shop.shop_id':shop_id,'cart.product.product_id':product_id};
										var query1={'_id': user_id,'cart.shop.shop_id':shop_id};
										
										if(cart_quantity==0){
												orderconflict=true;
												response.push({product_id:product_id,status:7,value:stock_quantity});//PRODUCT_CART_QUANTITY_ZERO = "7";
												
											}
										else if(stock_quantity==0){
												orderconflict=true;
												response.push({product_id:product_id,status:2,value:stock_quantity});//PRODUCT_NOT_AVAILABLE_IN_STOCK = "2";

												var product={'product_id':product_id,'quantity':stock_quantity,'time':t};
												bulkupdate.find(query).updateOne({ "$pull": { 'cart.$.product':{'product_id': product_id} } });
												bulkupdate.find(query1).updateOne({ "$addToSet": { "cart.$.product":  product } ,"$set": { 'cart.$.shop.time' :t  }});
												
											}
										else if(stock_quantity>=cart_quantity){
												var query={'_id':new ObjectID(product_id), 'quantity': {'$gte': cart_quantity}};
												bulk.find(query).updateOne({'$inc': {'quantity': -cart_quantity} });
												response.push({product_id:product_id,status:1,value:stock_quantity});//PRODUCT_AVAILABLE_IN_STOCK = "1";
												actual_amount+=mrp*cart_quantity;

												//logic to decrease level3 count when stock_quantity==cart_quantity i.e it is just sold out 
												if(stock_quantity==cart_quantity){
												//	decrementlevel3count(shop_id,category);
												}	

										}else{
												orderconflict=true;
												actual_amount+=mrp*stock_quantity;
												response.push({product_id:product_id,status:3,value:stock_quantity});// PRODUCT_QUANTITY_DECREASED = "3";

												var product={'product_id':product_id,'quantity':stock_quantity,'time':t};
												bulkupdate.find(query).updateOne({ "$pull": { 'cart.$.product':{'product_id': product_id} } });
												bulkupdate.find(query1).updateOne({ "$addToSet": { "cart.$.product":  product } ,"$set": { 'cart.$.shop.time' :t  }});
										}

										total+=mrp*cart_quantity;

										productInfo.push({product_id:new ObjectID(product_id),mrp:mrp,imageid:imageid,quantity:Number(cart_quantity),name:name,product_status:1});//product status is defined in statuscode/productstatus.java
									}

									if(orderconflict)
										{	
											if(bulkupdate.length)
												bulkupdate.execute(function(err, document_) {
													if (err) 
														 handleError(res, err, 'Failed to add cart product');
													else 
														res.status(200).json({response:response,actual_amount:actual_amount}); 
												});
											else
												res.status(200).json({response:response,actual_amount:actual_amount}); 
										 
										}
									else{
										
										bulk.execute(function(err, document_) {
											if (err) 
												 handleError(res, err, 'Failed to add cart product');
											else 
												{
													// console.log(productInfo);
													// console.log(total);

													var orderSchema={
														//basic order details
														total:total,
														product_info:productInfo,
														shop_id:shop_id,
														shop_name:shop_name,
														shop_images:shop_image,
														user_image:user_image,
														user_number:user_number,
														seller_uid:seller_uid,
														user_id:user_id,
														user_name:user_name,
														address_id:user_address_id,//intially this will be NA , this will be set to id when we select a address type 
														
														start_date:new Date(),
														last_update_date:new Date(),

														order_status:1,	//these status are defined in statuscode/orderstatus.java
														
													};

													coll.insertOne(orderSchema, {w:1}, function(err, result) {
														if (err) {
															handleError(res, err, "Failed to create new "+DocType);
														} else {
															var temp=result.ops[0];

															//once we insert a new order , we need to remove that thing from cart
															database.collection('user').findOneAndUpdate({ '_id': new ObjectID(user_id) },
																{ $pull: { 'cart':{'shop.shop_id':  shop_id } } }, function(err, document_) {
																if (err) {
																	 handleError(res, err, "Failed");
																} else {
																	var newOrder={
																		_id:temp._id,
																		order_status:temp.order_status,
																		shop_images:temp.shop_images,
																		user_image:temp.user_image,
																		seller_uid:temp.seller_uid,
																		type:temp.type,
																		isNew:temp.isNew,
																		total:temp.total,
																		user_name:temp.user_name,
																		shop_name:temp.shop_name,
																		totalproduct:totalproduct
																	};
																	res.status(200).json(newOrder);

																	var obj = newOrder;
																	obj.type="order"
																	obj.isNew=true;
																	delete obj.product_info;

																	// var obj={
																	// 	_id:newOrder._id,
																	// 	order_status:newOrder.order_status,
																	// 	type:"order",
																	// 	isNew:true		
																	// };

																	sendSellerNotif(seller_uid,obj);

																}
															});
														
														}
													});
												};

											});
									}	

									
								});

				
			});
	};


	var decrementlevel3count=function(shop_id,category){
		var shopCategoryColl=database.collection("shopCategory");
		shopCategoryColl.aggregate([
                    {
                        "$match": {
                          "shop_id":shop_id
                        }
                    },
                    {   $unwind:'$category'  },
                    {   $unwind:'$category.level3'  },
                    {
                        "$match": { 'category.level1.name':category[0],'category.level2.name':category[1],'category.level3.name':category[2] }
                    },
                    {   
                        $project: {
                            "_id":0,
                            'count':"$category.level3.count"
                        }   
                    }
                ]).toArray(function(err, doc) {
                            var count=doc[0].count-1;
                            // console.log(count);

                            var bulk = shopCategoryColl.initializeOrderedBulkOp();
                            bulk.find(search_level3).updateOne({ "$pull": { 'category.$.level3':{'name': category[2] } } });
                            bulk.find(search_level2).updateOne({ "$addToSet": { "category.$.level3":  {name:category[2],endpoint:category_image,count:count} } });
                            
                            bulk.execute(function(err, document_) {
                                if (err) 
                                     handleError(res, err, 'Failed to add cart product');
                                else 
                                    res.status(200).json(document_); 
                            });

                        });
	}


	var postDocument = function(req, res) {
		var document_ = req.body;
		document_['last_update_date']= new Date();

		//console.log('Adding document_: ' + JSON.stringify(document_));
		coll.insertOne(document_, {w:1}, function(err, result) {
				if (err) {
					handleError(res, err, "Failed to create new "+DocType);
				} else {
					console.log('customer id ' +document_.user_id  + ' order id'+result.ops[0]._id);
					// addOrderIdToUser(res,result.ops[0].user_id,result.ops[0]._id);//pass userid and order id 
					
					var user_id=result.ops[0]._id,order_id=result.ops[0].user_id;
					var order={'order_id':new ObjectID(order_id),'time':new Date()};

			var query={'_id': new ObjectID(user_id)};
			
			database.collection("user").findOneAndUpdate(query, { $addToSet: { 'orders': order } },function(err, document_) {
												if (err) {
													 handleError(res, err, 'Failed to add favourite product id ' +product_id  + ' to shopid '+shop_id);
												} 
												else {console.log(document_);
														}
								});

					res.status(201).json(result.ops[0]);

				}
			});
	};

	//in the query we need to pass the user id and shop id 
	var addOrderIdToUser = function(res,user_id, order_id) {

		try {
			var order={'order_id':new ObjectID(order_id),'time':new Date()};

			var query={'_id': new ObjectID(user_id)};
			
			database.collection("user").findOneAndUpdate(query, { $addToSet: { 'orders': order } },function(err, document_) {
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

	
	var queryDocument = function(req, res) {
		var query = url.parse(req.url, true).query;

		var limit=5;
		if(query['limit']){		
			limit=Number(query['limit']);
			delete query['limit'];
			}
		console.log(limit);
		console.log(typeof limit)

		if(query['_id']){
			if(!ObjectID.isValid(query['_id']))
				{res.status(400).json({'count':0,'last_id':0,'results':'invalid id'}); return;}
			query['_id']={$lt:new ObjectID(query['_id'])};
			}

		if(query['last_id']){
			if(!ObjectID.isValid(query['last_id']))
				{res.status(400).json({'count':0,'last_id':0,'results':'invalid id'}); return;}
			query['last_id']={$lt:new ObjectID(query['last_id'])};
			}	

		var order_status=query['order_status'];
		if(order_status){
			order_status=order_status.split(',').map(Number);
			query['order_status']={"$in":order_status}
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

	documentRouter.get('/', getAllDocument);
	documentRouter.post('/', postDocument);
	documentRouter.get('/filter/:order_status',filterDocuments);
	documentRouter.get('/:id', getDocumentById);
	documentRouter.put('/:id', putDocument);//change to put
	documentRouter.delete('/:id', deleteDocument);
	documentRouter.get('/query/parameter/',queryDocument);
	documentRouter.post('/postOrder', PostOrder);

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