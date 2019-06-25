// 'use strict'
module.exports = function SetupRouter(CollectionName,SellerCollectionName,UserCollectionName,database,DocType) {
	
	var FCM = require('fcm-node');
	var seller_server_key = "AAAAR7t6afg:APA91bF9_Q7rcOZ-jTaIJg4derosIl8FsijniL40WVdMo10V-rB23Rz5-Sy2LgUYLLxc2_Q5JFVT8a_QTFhHaA88KPxkF4B-7NsByn_MwKjqPyq8MAZjRDOY7Og23WVKFQFrunGYyyeW"
	var seller_fcm = new FCM(seller_server_key);
	var user_server_key = "AAAAVu7LMhc:APA91bF93-OIIyjJrrHQJ331NUhmD6edUeo-zf-_uUx-g4E7cMi2I5cKqjyngYxiAQwsfrf27OaQTLFKLBfezt5kXEkPCql24GCgY8LmL1sZ1U_dB5CfKyYgMjzlfGW4ty-sjKERi_tT"
	var user_fcm = new FCM(user_server_key);

	var express = require('express');
	var url = require('url');
	var elastic = require('../elastic/elasticSearch');

	var documentRouter = express.Router();

	var mongodb = require("mongodb");
	var ObjectID = mongodb.ObjectID;

	var coll= database.collection(CollectionName);
	var seller_coll = database.collection(SellerCollectionName);
	var user_coll = database.collection(UserCollectionName);

	var OrderLimit=5;

//update the status for all products which are not available or quantity has been reduced
	var updatePartialOrder = function(req, res) {
		var _id = new ObjectID(req.query._id);
		var type=req.query.type;
		var opponent_id=req.query.opponent_id;
		var order_status=Number(req.query.order_status);
		var details=req.body;

		var product_ids=[];
		for (var key in details) {
    		// var item = details[key];
    		// console.log(item)
    		product_ids.push(key)
			}
		// console.log(product_ids);
		var obj;//json object to send back

		coll.find({ _id: _id }).forEach(function (doc) {

			  	doc.order_status=order_status;
			  	doc.last_update_date=new Date();
			  	var changed_amount=0;
			  	
			    doc.product_info.forEach(function (product_info) {
			    	// console.log("id",product_info.product_id)
			    	if(product_ids.includes(product_info.product_id.toString()))
			    		  {
			    		  	// console.log("id1",product_info.product_id)
			    		  		var detail=details[product_info.product_id];
			      				product_info.product_status=detail.status;
								product_info.quantity=detail.quantity;
								changed_amount+=product_info.mrp*detail.quantity;			      				
			      		}
			      	else
			      		changed_amount+=product_info.mrp*product_info.quantity;	
			    	});
			    doc.total=changed_amount;
				coll.save(doc);

				// obj={
				// 		_id:doc._id,
				// 		order_status:doc.order_status,
				// 		type:"order",
				// 		isNew:false		
				// 	};
				obj = doc;
				obj.type="order"
				obj.isNew=false;
				delete obj.product_info;

  		},function(err) { 
  			if(err)console.log(err);
  			// res.status(200).json({"status":true});
  							
			res.status(200).json({obj});
											
			if(type=="seller"){
				sendCustomerNotif(opponent_id,obj);
			}else if(type=="customer"){
				sendSellerNotif(opponent_id,obj);
			}

  		 });
	};

	var getProductsOfOrder = function(req, res) {
		var _id = new ObjectID(req.query._id);
		// coll.findOne(
		// 		{ _id: _id },
		// 	    { product_info: 1},function(err, results) {
		// 			if (err) {
		// 				handleError(res, err, "Failed");
		// 			} else {
		// 				res.status(200).json({'count':results.length,'results':results});
		// 			}			
		// 		});

		var cursor=coll.aggregate([
				{
					"$match": { "_id":_id}
				},
				{	
					$project: {"product_info":1,_id:0}	
				}

			]);

		cursor.toArray(function(err, docs) {
			docs=docs[0].product_info;
			console.log(docs);	
			var ids=[];

			for(var i=0;i<docs.length;i++)
				ids.push(docs[i].product_id)
			console.log(ids)

			database.collection('product').find({"_id":{"$in":ids}}).toArray(function(err, results) {
								console.log(results);
								res.status(200).json({'count':results.length,results:results,fix_details:docs});
							});

			
			
		});
	};

	var CUSTOMER_CANCELLED_PARTIAL_ORDER=12,SHOPKEEPER_CANCELLED_ORDER=15,CUSTOMER_CANCELLED_ORDER=16;
//to update the overall status of a order
	var updateOrderStatus = function(req, res) {
		var _id = new ObjectID(req.query._id);
		var opponent_id=req.query.opponent_id;
		var order_status=Number(req.query.order_status);
		var type=req.query.type;

		coll.findOneAndUpdate(
				{ _id: _id },
			    { $set:
			      {
			       order_status:order_status,
			       last_update_date:new Date()
			      }
			    },{returnOriginal:false},function(err, doc) {
					if (err) {
						handleError(res, err, "Failed");
					} else {


							if(order_status==CUSTOMER_CANCELLED_PARTIAL_ORDER || order_status==SHOPKEEPER_CANCELLED_ORDER||order_status==CUSTOMER_CANCELLED_ORDER)
							{

								var bulk = database.collection('product').initializeOrderedBulkOp();
									
								doc.value.product_info.forEach(function (product_info) {
							    	var product_id=product_info.product_id;
							    	var qty=Number(product_info.quantity);

				    				var query={'_id':new ObjectID(product_id)};
									if(qty>0)bulk.find(query).updateOne({'$inc': {'quantity': qty} });
						    	
						    	});

						    	bulk.execute(function(err, document_) {
									if (err) 
										 handleError(res, err, 'Failed to revert back products to stock');
									else 
										// res.status(200).json({response:"products reverted to stock"}); return;
										console.log("products reverted to stock")
									});
							
							}
						

						// res.status(200).json({'results':doc.value});
						// return;
						
						// var obj={
						// 			_id:doc.value._id,
						// 			order_status:doc.value.order_status,
						// 			type:"order",
						// 			isNew:false		
						// 		};

						var obj = doc.value;
						obj.type="order"
						obj.isNew=false;
						delete obj.product_info;
		
										
						res.status(200).json({obj});
														
						if(type=="seller"){
							sendCustomerNotif(opponent_id,obj);
						}else if(type=="customer"){
							sendSellerNotif(opponent_id,obj);
						}
					}			
				});
	};


	var ShopOrderSelection = function(req, res) {
		// var shop_id = new ObjectID(req.query.shop_id);
		
		var seller_uid = req.query.seller_uid;
		var last_id = req.query.last_id;
		
		var limit=Number(req.query.limit);
		if(limit)OrderLimit=limit;

		//parsing the order status 
		var order_status=req.query.order_status;
		order_status=order_status.split(',').map(Number);
		// console.log(order_status);
		var cursor;

		if(last_id){      

			 cursor=coll.aggregate([
			 	{
					"$match": { "seller_uid":seller_uid, "order_status":{"$in":order_status} ,"_id": { $lt: new ObjectID(last_id) } }
				},
				{ 	$sort:{'_id':-1} 	},
				{	"$limit":OrderLimit },
				// {	
				// 	$project: {"product_info":0}	
				// }
				
			]);

		}
		else{
			 cursor=coll.aggregate([
				{
					"$match": { "seller_uid":seller_uid, "order_status":{"$in":order_status}}
				},
				{ 	$sort:{'_id':-1} 	},
				{	"$limit":OrderLimit	},
				// {	
				// 	$project: {"product_info":0}	
				// }

			]);
		}
	   // Get all the aggregation results
		cursor.toArray(function(err, docs) {
			console.log(docs);
			if(!docs.length){
					res.status(200).json({'count':docs.length,'last_id':'null','results':docs});
			}else{
				var lt=docs[docs.length-1]._id;
				res.status(200).json({'count':docs.length,'last_id':lt,'results':docs});
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

	var sendCustomerNotif = function(user_id,message){

			console.log("user_id ",user_id)
			console.log("message ",message)

      		var query={'_id': new ObjectID(user_id)};
				
		   user_coll.findOne(query, { 'fcm_token':1},function (err,user) {     

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

                      user_fcm.send(msg,function(err,response){
                      	if(err){
                      		console.log(err)
                      	}else{
                      		console.log("notif sent")
                      	}
                      })
                            
                  }


                }
                 else {
                      console.log("can't find the specific user when trying to post order");
                      }  
              }
        });
	}
	
	documentRouter.get('/', ShopOrderSelection);
	documentRouter.post('/updateOrderStatus', updateOrderStatus);
	documentRouter.post('/getProductsOfOrder', getProductsOfOrder);
	documentRouter.post('/updatePartialOrder', updatePartialOrder);

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