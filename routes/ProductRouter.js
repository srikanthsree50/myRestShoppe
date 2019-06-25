// 'use strict'
module.exports = function SetupRouter(validationSchemaPath,CollectionName,CollectionFilter,CollectionShopCategory,database,DocType) {
	var async = require("async");
	var express = require('express');
	var url = require('url');
	var elastic = require('../elastic/elasticSearch');
	// var individualShopCategory = require('../routes/IndividualShopCategory');

	var validationSchema = require(validationSchemaPath);

	var documentRouter = express.Router();

	var mongodb = require("mongodb");
	var ObjectID = mongodb.ObjectID;

	var coll= database.collection(CollectionName);
	var shopCategoryColl=database.collection(CollectionShopCategory);
	var collFilter= database.collection(CollectionFilter);

    

	/*  "/products"
	*    GET: finds all products
	*    POST: creates a new product
	*/

	var updateAllDocument = function(req, res) {
	
		coll.find().forEach(function(doc) {
		    coll.update(
		        { "_id": doc._id },
		        // { "$set": { "shop_name": "test shop name" } }
                { "$set": { "product_id": doc._id.toString() } }

		    );
		}, function(err) {
  			// done or error
  			res.status(200).json({'completed':"yes"});
		});

	
	};

	var getAllDocument = function(req, res) {
		//to filter out fileds to show :find({},{'name':1,'_id':0})

		var query = url.parse(req.url, true).query;

		if(query['_id']){
			if(!ObjectID.isValid(query['_id']))
				{res.status(400).json({'count':0,'last_id':0,'results':'invalid id'}); return;}
			query['_id']=new ObjectID(query['_id']);
			}

		coll.find(query).sort({ 'last_update': -1 }).toArray(function(err, documents) {
				if (err) {
					handleError(res, err, "Failed to get all "+DocType);
				} else {
					res.status(200).json({'count':documents.length,'results':documents});
					}			
			});
	};

	var postDocument = function(req, res) {
		var document_ = req.body;
		// document_['quantity']=5;//this should come form shopkeeper side
		// document_['available']=true; 
        var id=new ObjectID();
        document_['_id']=id;
		document_['last_update']=new Date(); 
        document_['product_id']=id.toString();

		console.log('Adding document_: ' + JSON.stringify(document_));
		coll.insertOne(document_, {w:1}, function(err, result) {
				if (err) {
					handleError(res, err, "Failed to create new "+DocType);
				} else {
					var document=result.ops[0];
					elastic.addDocument(document);
					addCategory(res,document.category,document.shop_id,document.imageid,document.extra_details);
					// res.status(201).json(document);
				}
			});
	};

	var addCategory = function (res,category,shop_id,imageid,filters) {
       
        var category_image=imageid.split(",")[0];
        console.log(category_image);

        var catlen=category.length;
		for(var i=3-catlen;i>0;i--){category.push("#") }

        console.log(shop_id)
        console.log(category);
        var id3=new ObjectID();
        
    try {

    	shopCategoryColl.aggregate([
                    {
                        "$match": {
                          "shop_id":shop_id
                        }
                    },
                    {   $unwind:'$category'  },
                    {
                        "$match": { 'category.level1.name':category[0],'category.level2.name':category[1] }
                    },
                    {
                        $project:{ _id:0,level1_id:'$category.level1._id',level2_id:'$category.level2._id','category.level3':1}
                    },
                    {   $unwind:'$category.level3'  },
                    {   $group:{
                            _id:null,
                            level3_name:{$push:'$category.level3.name'},
                            level3_count:{$push:'$category.level3.count'},
                            level3_id:{$push:'$category.level3._id'},
                            level1_id:{$first:'$level1_id'},
                            level2_id:{$first:'$level2_id'},
                        }
                    }
                ]).toArray(function(err, doc) {
                    // res.status(200).json(doc); return;
                    console.log(doc.length) 
                    if(doc.length==0){//it means category1 and category2 doesnt exists so insert a whole new category 

                        console.log("inserting new category division")
                        var newcategory={
                        	_id:new ObjectID(),
                            level1:{_id:new ObjectID(),name:category[0],endpoint:category_image},
                            level2:{_id:new ObjectID(),name:category[1],endpoint:category_image},
                            level3:[{_id:id3,name:category[2],endpoint:category_image,count:1}]  
                        };
                        console.log(newcategory)

                        shopCategoryColl.updateOne({'shop_id':shop_id},{ $addToSet: { 'category': newcategory},$set:{last_update_date:new Date()},$push: { images: { $each: [ category_image ], $slice: -4 }  } }, function(err, document_) {
                                                                    if (err) {
                                                                         handleError(res, err, 'Failed');
                                                                    } else {
                                                                        res.status(200).json(document_);
                                                                        // addFilter(res,id3,filters,true,document_); 
                                                                    }
                                                              });

                    }else{ //it means category1 and category2 exists and we dont know if it contains category3
                        var names=doc[0].level3_name;
                        var count=doc[0].level3_count;
                        var level1_id=doc[0].level1_id;
                        var level2_id=doc[0].level2_id;
                        var level3_id=doc[0].level3_id;

                        var pos=Number(names.indexOf(category[2]));
                        console.log(pos)
                        if(pos==-1)//it means category2 is new and so insert just level3
                        {   
                            console.log("insert just level3")
                            var search_level2={'shop_id': shop_id,'category.level1._id':level1_id,'category.level2._id':level2_id};
                            shopCategoryColl.updateOne(search_level2,{ $push: { 'category.$.level3': {_id:id3,name:category[2],endpoint:category_image,count:1}, images: { $each: [ category_image ], $slice: -4  } },$set:{last_update_date:new Date()} }, function(err, document_) {
                                                                                    if (err) {
                                                                                         handleError(res, err, 'Failed');
                                                                                    } else {
                                                                                        res.status(200).json(document_);
                                                                                        // addFilter(res,id3,filters,true,document_);
                                                                                    }
                                                                              });
                        }
                        else{//even same category3 is present , but we will update the image 
                            
                            console.log("update just level3")
                            var search_level2={'shop_id': shop_id,'category.level1._id':level1_id,'category.level2._id':level2_id};
                            var search_level3={'shop_id': shop_id,'category.level1._id':level1_id,'category.level2._id':level2_id,'category.level3._id':level3_id[pos]};
                            
                            // var endpoint='category.$.level3.'+pos+'.endpoint';
                            // console.log(endpoint)
                            // shopCategoryColl.updateOne(search_level2,{ $set: {'$endpoint' : category_image} }, function(err, document_) {
                            //                                                         if (err) {
                            //                                                              handleError(res, err, 'Failed');
                            //                                                         } else {
                            //                                                             res.status(200).json(document_);
                            //                                                         }
                            //                                                   });

                            var bulk = shopCategoryColl.initializeOrderedBulkOp();
                            bulk.find(search_level2).updateOne({ "$pull": { 'category.$.level3':{'name': category[2] } } });
                            bulk.find(search_level2).updateOne({ "$addToSet": { "category.$.level3":  {_id:new ObjectID(level3_id[pos]),name:category[2],endpoint:category_image,count:count[pos]+1} },$push: { images: { $each: [ category_image ], $slice: -4 }  } });
                            
                            bulk.execute(function(err, document_) {
                                if (err) 
                                     handleError(res, err, 'Failed to add cart product');
                                else 
                                    res.status(200).json(document_); 
                                	// addFilter(res,new ObjectID(level3_id[pos]),filters,false,document_);
                            });

                             //res.status(200).json({"res":"all ok"}); return;
                        }
                        
                    }
                 
                  
                });
       
        } catch (e){
                   handleError(res, err, 'Failed');
            }     
    };

    var addFilter =  function(res,id3,filters,createnew,category_doc) {
        console.log("filter id "+id3);

        if(filters.length==0){
            res.status(200).json({"response":"no extra field in product"});
            return; 
        }

        if(createnew){ console.log("creating a new filter document"); 
                        //reconstruct the filter

                        var modified_filters=[];
                        filters.forEach(function(filter){
                            modified_filters.push({_id:new ObjectID(),name:filter.name,type:filter.type,value:[filter.value]});
                        });

                        collFilter.insertOne({ _id: id3, filter:modified_filters } , function(err, document_) {
                                        if (err) {
                                             handleError(res, err, 'Failed');
                                        } else {
                                           res.status(200).json(document_);  
                                        };
                                    }); 
        }
        else{        
                

            var bulk = collFilter.initializeOrderedBulkOp();
            var asyncTasks = [];
            filters.forEach(function(filter){
                    
                asyncTasks.push(function(callback){

                collFilter.aggregate([
                    {
                        "$match": {
                          "_id":id3
                        }
                    },
                    {   $unwind:'$filter'  },
                    {
                        "$match": { 'filter.name':filter.name,'filter.type':filter.type}
                    }]).toArray(function(err, result) {
                            console.log(result)
                            if (err) {
                                 handleError(res, err, 'Failed');
                            } else 
                                {   
                                    if(result.length){//it means filter exists so just insert the new value if its unique

                                                var query={'_id': id3,'filter._id':result[0].filter._id};
                                                console.log(query);
                                                console.log("just insert value as filter already exists")
                                                bulk.find(query).updateOne({ $addToSet: { 'filter.$.value': filter.value} });
                                                callback();       
                                    }
                                    else{//it means that particular filter does not exits so insert a new filter object

                                            console.log("insert new whole filter into array")
                                            filter['_id']=new ObjectID();
                                            console.log(filter)
                                            bulk.find({'_id': id3}).updateOne({  $addToSet: { 'filter': filter} });
                                            callback();
                                    }
                                }
                         });


                    });


                });

                async.parallel(asyncTasks, function(){
                  //when All tasks are done now
                  bulk.execute(function(err, document_) {
                                if (err) 
                                     handleError(res, err, 'Failed to add cart product');
                                else 
                                    res.status(200).json(document_);

                            });
                

            });

                
        }
       }; 

	// var postES=function(body_)
	// {	
	// 	var type_=body_['category'];
	// 	var _id=body_['_id'].toString();
	// 	delete body_._id;
	// 	delete body_.category
	// 	// console.log(_id);
	// 	// console.log(typeof _id);
	// 	//console.log(JSON.stringify(body_));	
	// 	//console.log(type_);
	// 	client.index({  
	// 	index: 'products',
	// 	id: _id,
	// 	type: type_,
	// 	body: body_
	// 	},function(err,resp,status) {
	// 	console.log(resp);
	// 	})
	// };


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
		document_['last_update']=new Date();
        document_['product_id']=id.toString();
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
		var shop_id=req.query.shop_id;
		var category=req.query.category;
        var shopType=req.query.shopType;

		category=category.split(",");
		var catlen=category.length;
		for(var i=3-catlen;i>0;i--){category.push("#") }

		console.log('Deleting '+DocType+': ' + id);
		coll.deleteOne({'_id':new ObjectID(id)}, {w:1}, function(err, result) {
				if (err) {
					handleError(res, err, "Failed to delete "+DocType);
				} else {
					console.log('' + result + ' document(s) deleted');
					//res.status(200).json(category);
                    elastic.deleteDocument(shopType,id);
					decrementlevel3Count(res,shop_id,category);
				}
			});
	};

	var hardDelete = function(req, res) {
		var id = req.params.id;
		
		console.log('hard Deleting '+DocType+': ' + id);
		coll.deleteOne({'_id':new ObjectID(id)}, {w:1}, function(err, result) {
				if (err) {
					handleError(res, err, "Failed to delete "+DocType);
				} else {
					console.log('' + result + ' document(s) deleted');
					res.status(200).json({"response":"deleted"});
				}
			});
	};

	var decrementlevel3Count = function(res,shop_id,category){

		 shopCategoryColl.aggregate([
                    {
                        "$match": {
                          "shop_id":shop_id
                        }
                    },
                    {   $unwind:'$category'  },
                    {
                        "$match": { 'category.level1.name':category[0],'category.level2.name':category[1] }
                    },
                    {
                        $project:{ category:1,level3_size:{"$size":'$category.level3'}	} 
                    },
                    
                    {   $unwind:'$category.level3'  },
                    {
                        "$match": { 'category.level1.name':category[0],'category.level2.name':category[1],'category.level3.name':category[2] }
                    },
                    {
                        $project:{ _id:0,'category_id':'$category._id',level1_id:'$category.level1._id',level2_id:'$category.level2._id',level3:'$category.level3',level3_size:1}
                    },
                ]).toArray(function(err, doc) {
                    // res.status(200).json(doc); 
                    // return;
                   	 		var bulk = shopCategoryColl.initializeOrderedBulkOp();
                            	
                    		var count=doc[0].level3.count;
                    		var category_id=doc[0].category_id;
                    		var level3_size=doc[0].level3_size;
                    		if(count==1 && level3_size==1){//it means only one category is present in level3 on deleting that we should remove whole category
                    			
                    			console.log("only one category is present in level3");
                    			var removeCategory={'shop_id': shop_id};
                				bulk.find(removeCategory).updateOne({ "$pull": { 'category':{'_id':category_id} } ,$set:{last_update_date:new Date()}});
                            
                    		}else{
                    			
                    			count--;
                    			console.log("decrement level3 count");
                            	var search_level2={'shop_id': shop_id,'category.level1._id':doc[0].level1_id,'category.level2._id':doc[0].level2_id};
                            	var search_level3={'shop_id': shop_id,'category.level1._id':doc[0].level1_id,'category.level2._id':doc[0].level2_id,'category.level3._id':doc[0].level3._id};
                           		
                           		if(count==0)//just remove the level3
                           			bulk.find(search_level2).updateOne({ "$pull": { 'category.$.level3':{'name': category[2] } },$set:{last_update_date:new Date()} });
                    			else(count>0)
                    				{   bulk.find(search_level2).updateOne({ "$pull": { 'category.$.level3':{'name': category[2] } } });
                    					bulk.find(search_level2).updateOne({ "$addToSet": { "category.$.level3":  {_id:new ObjectID(),name:category[2],endpoint:doc[0].level3.endpoint,count:count} } });
                    				}
                    			
                    		}

                            bulk.execute(function(err, document_) {
                                if (err) 
                                     handleError(res, err, 'Failed to add cart product');
                                else 
                                    // res.status(200).json(document_); 
                                res.status(200).json({response:"decrementlevel3Count done"}); 
                            });

                });
	}

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

	var queryDocument = function(req, res) {
		var query = url.parse(req.url, true).query;
		var pageno = req.params.pageno;

        var limit=8;
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

	//apply pagination in this also
	var getDocumentByTextSearch=function(req, res) {
	var search_text=req.query.search_text;	

	coll.find( { $text: { $search: search_text } } ).sort({ '_id': -1 }).limit(pagesize).toArray(function(err, documents) {
				if (err) {
					handleError(res, err, "Failed to get all "+DocType);
				} else {
					var len=documents.length;
					if(len)last_id = documents[len-1]['_id'];
					res.status(200).json({'count':documents.length,'last_id':last_id,'results':documents});
				}			
			});
	};	
	// var mcache = require('memory-cache');

	// var cache = (duration) => {
	//   return (req, res, next) => {
	//     let key = '__express__' + req.originalUrl || req.url
	//     let cachedBody = mcache.get(key)
	//     if (cachedBody) {
	//       res.send(cachedBody)
	//       return
	//     } else {
	//       res.sendResponse = res.send
	//       res.send = (body) => {
	//         mcache.put(key, body, duration * 1000);
	//         res.sendResponse(body)
	//       }
	//       next()
	//     }
	//   }
	// }

	// var categoryWiseProducts = function(req, res) {
	// 	var shop_id =req.query.shop_id;

 //    	try { 

 //            var cursor=coll.aggregate([
                        
 //                            {
 //                                "$match": {"shop_id":shop_id}
 //                            },
 //                            { "$group": {
 //    					        "_id": {
 //    					            "level1": { $arrayElemAt: [ "$category", 0 ] },
 //    					            "level2": { $arrayElemAt: [ "$category", 1 ] },
 //    					        },
 //    					        "count": { "$sum": 1 },
 //    					        products:{$push:"$$ROOT"}
 //    					    }},
 //    					    { $project: { _id: 0,level1:'$_id.level1',level2:'$_id.level2',count:1, products: { "$reverseArray": { $slice: [ "$products", -6 ] } } } }

 //                    ]);
     
 //            cursor.toArray(function(err, results) {
 //                    //console.log("docs"+docs);
 //                    res.status(200).json({results:results});
 //                });
 //            } catch (e){
 //                       console.log(e);
 //                }  
		
	// };

	var filterProductViaCategory = function(req, res) {
		var shop_id=req.query.shop_id;
		var level1=req.query.level1;
		var level2=req.query.level2;
		var level3=req.query.level3;
		var limit=Number(req.query.limit);
		if(!limit)limit=5;
		var last_id=req.query.last_id;

		// console.log(level3)

		var query=[{"shop_id":shop_id}];
		if(level1){
			query.push({'category.0':level1});
		}
		if(level2){
			query.push({ 'category.1':level2 });
		}
		if(level3){
			query.push({'category.2':level3 });
		}
		 
		console.log(query);
		console.log(last_id)
		
		var cursor;
		try { 

			if(last_id){      

				 cursor=coll.aggregate([
					{   	                        
		             "$match": { $and :query},
		            },
					{ 	$sort:{'last_update':-1} 	},
					{
						$match: { "_id": { $lt: new ObjectID(last_id) }  }
					},
					{'$limit':limit}
				]);
			}else{

				cursor=coll.aggregate([
					{   	                        
		               	"$match": { $and :query},
		            },
					{ 	$sort:{'last_update':-1} 	},
					{ 	'$limit':limit}
				]);
			}

	        cursor.toArray(function(err, results) {
	                var len=results.length;
					if(len)last_id = results[len-1]['_id'];
					if(len<limit)last_id="null";
	                res.status(200).json({'count':len,'last_id':last_id,'results':results});
	            });

	    } catch (e){
	                   console.log(e);
            }  
		
	};
		
	var outOfStockProducts=function(req, res) {
		var shop_id=req.query.shop_id;
		var last_id=req.query.last_id;
		var limit=Number(req.query.limit);
		if(!limit)limit=pagesize;

		var query={};
		query['shop_id']=shop_id;
		query['quantity']=0;

		if(last_id)query['_id']={$lt:new ObjectID(last_id)};
			
		console.log(query);
		coll.find(query).sort({ '_id': -1 }).limit(limit).toArray(function(err, documents) {
					if (err) {
						handleError(res, err, "Failed to get all "+DocType);
					} else {
						var len=documents.length;
						if(len)last_id = documents[len-1]['_id'];
						if(len<limit)last_id="null";
						res.status(200).json({'count':documents.length,'last_id':last_id,'results':documents});
					}			
				});
	};	

	var getLiveFilters = function(req, res) {
		var shop_id=req.query.shop_id;
		var level1=req.query.level1;
		var level2=req.query.level2;
		var level3=req.query.level3;
	
		var query={},shop_query={};

		if(shop_id)shop_query['shop_id']=shop_id;
		if(level1)query['category.0']=level1;
		if(level2)query['category.1']=level2;
		if(level3)query['category.2']=level3;
		
		console.log(shop_query)
		console.log(query);

		try { 
				coll.aggregate( [                       
                                    {
                                        "$match":shop_query
                                    },
                                    {
                                        "$match": query
                                    },
                                    {   $facet: {     
                                                "filters":[     {
                                                                    $project:{ _id:0,'extra_details':1,mrp:1}
                                                                },
                                                                {   $unwind:'$extra_details'  },
                                                                {
                                                                        $group:{
                                                                            _id:{ name: "$extra_details.name" ,type:'$extra_details.type'},
                                                                            value:{$addToSet:'$extra_details.value'}
                                                                        } 
                                                                },
                                                                {
                                                                    $project:{ name:'$_id.name',type:'$_id.type',value:1,_id:0}
                                                                }
                                                         ],

                                           "mrp_buckets":[      {
                                                                  $bucketAuto: {
                                                                    groupBy: "$mrp",
                                                                    buckets: 6
                                                                  }
                                                                },
                                                                {
                                                                    $project:{min:'$_id.min',max:'$_id.max',count:1,_id:0}
                                                                }
                                                        ]                   

                        }

                }]).toArray(function(err, result) {
                		res.status(200).json(result[0]);
	            });

	    } catch (e){
	                   console.log(e);
        		   }  
		
	};

		// var query=req.query;
		// var queryObject = url.parse(req.url,true).query;
  //       var keys=Object.keys(queryObject);
        
		// for (var i = 0, len=keys.length; i < len; i++) {
		// 	var qry=query[keys[i]];
		// 		console.log(qry);
		// }

	var applyFilter = function(req, res) {
		var shop_id=req.query.shop_id;

        var sortLimit=6;
        var last_id=req.query.last_id;
        var limit=Number(req.query.limit);
        if(limit)sortLimit=limit;

        var condition={};
        if(last_id)condition["_id"]= { $lt: new ObjectID(last_id) };

        var level1=req.query.level1;
        var level2=req.query.level2;
        var level3=req.query.level3;
        
        var levelquery={};
        if(level1)levelquery['category.0']=level1;
        if(level2)levelquery['category.1']=level2;
        if(level3)levelquery['category.2']=level3;

		var filters=req.body.filters;
        console.log(filters);
        var mrp_buckets=req.body.mrp_buckets;
        console.log(mrp_buckets);

        var aggregate=[];
        aggregate.push({  $sort:{_id:-1}  });
        aggregate.push({ "$match":condition }); 
        if(shop_id)aggregate.push({ "$match":{shop_id:shop_id} });
        aggregate.push({ "$match":levelquery });
                    
        var query=[];            
        for (var i = 0, len=mrp_buckets.length; i < len; i++) {
                var bucket=mrp_buckets[i];
                query.push( { mrp: { $gte: bucket.min, $lte: bucket.max } } );    
            }

        console.log(query);  
        if(query.length>0){aggregate.push( {     "$match": { $or:query}    } );    } 

		for (var i = 0, len=filters.length; i < len; i++) {
				var filter=filters[i];
				var match={
                        "$match": { 'extra_details': { '$in': filter }  }
					  };
        		aggregate.push(match);		
        	}
        aggregate.push({ $limit :sortLimit});    
		console.log(aggregate)
		
		try { 
				coll.aggregate(aggregate).toArray(function(err, results) {
                         var len=results.length;
                         var last_id="null";
                         if(results.length) last_id=results[len-1]._id;
                         res.status(200).json({'count':len,'last_id':last_id,'results':results});
                		// res.status(200).json({count:results.length,results:results});
	            });
	    } catch (e){
	                   console.log(e);
        		   }  	
	};

    var applySort = function(req, res) {
        var sortLimit=6;
        var levelquery={};
        var sortquery={};
        var condition={};
        
        var shop_id=req.query.shop_id;
        var sortType=req.query.sortType;
        var level1=req.query.level1;
        var level2=req.query.level2;
        var level3=req.query.level3;


        var last_time=req.query.last_time;
        var last_id=req.query.last_id;
        var last_mrp=Number(req.query.last_mrp);
        var limit=Number(req.query.limit);
        if(limit)  sortLimit=limit;
        
        if(level1) levelquery['category.0']=level1;
        if(level2) levelquery['category.1']=level2;
        if(level3) levelquery['category.2']=level3;

        if(sortType=="low_high") sortquery['$sort']={ mrp :1,_id:-1 };
        else if (sortType=="high_low") sortquery['$sort']={ mrp :-1,_id:-1 }; 
        else if (sortType=="recent")  sortquery['$sort']={ last_update :-1 };
        
        // { $match: {shop: {$ne: []}} },
      
        if(last_id)
            {   
                last_id=new ObjectID (last_id);
               //sortquery["$sort"]["_id"]=-1;
               if (sortType=="high_low")
                    condition={ mrp:{$lte:last_mrp}, $or: [ { mrp: { $lt: last_mrp} }, {_id : { $lt: last_id } } ] };
                else if (sortType=="low_high") 
                    condition={ mrp:{$gte:last_mrp}, $or: [ { mrp: { $gt: last_mrp} }, {_id : { $lt: last_id } } ] };
                
            }
        else if(last_time)
                    condition={ last_update : { "$lt": new Date(last_time) } };
        

        var aggregate=[];
        // aggregate.push( { $addFields: { id: { $concat: [  {$substr:["$mrp", 0, -1 ]},"$product_id" ] } } });
        if(shop_id)aggregate.push({ "$match":{shop_id:shop_id} });
        aggregate.push({ $match:levelquery }); 
        aggregate.push(sortquery);
        aggregate.push({ "$match":condition }); 
        
        aggregate.push({ $limit :sortLimit});
        // aggregate.push({ $project :{mrp:1,last_update:1}});
        console.log(aggregate)
        
        coll.aggregate(aggregate).toArray(function(err, results) {

                 var len=results.length;
                 var last_id="null",last_mrp="null";
                 if(results.length) {
                    last_id=results[len-1]._id;
                    last_mrp=results[len-1].mrp;
                    last_time=results[len-1].last_update;
                }
                res.status(200).json({'count':len,last_mrp:last_mrp,'last_id':last_id,'last_time':last_time,'results':results});
        });
         
    };

    var findSimiliarShop =  function(req, res) {
        var level1=req.query.level1;
        var level2=req.query.level2;
        var level3=req.query.level3;
        var shopType=req.query.shopType;
        var last_id=req.query.last_id;

        var shopLimit=4;
        var limit=Number(req.query.limit);
        if(limit)shopLimit=limit;

        var condition={};
        if(last_id)condition["shop_id"]= { $lt: last_id };

        // var levelquery={};
        // if(level1){
        //     levelquery['category.level1.name']=level1;
        // }
        // if(level2){
        //     levelquery['category.level2.name']=level2;
        // }
        // if(level3){
        //     levelquery['category.level3.name']=level3;
        // }
        // console.log(levelquery);
        // coll.aggregate([ 
        //             {   $unwind:'$category'  },
        //             {
        //                 "$match": levelquery
        //             },
        //             {
        //                 $project:{ _id:0,shop_id:1}
        //             }
        //         ]).toArray(function(err, doc) {
        //             res.status(200).json(doc); 
        //            });

        var query={},shopquery={};
        if(level1)query['category.0']=level1;
        if (level2)query['category.1']=level2;
        if(level3)query['category.2']=level3;
        if(shopType)shopquery['shopType']=shopType;
        
        console.log(query)
        console.log(shopquery)
        console.log(condition)

        coll.aggregate([ 
                    {
                        "$match": shopquery
                    },
                    {
                        "$match": query
                    },
                    {
                        $match: condition
                    },
                    {
                        $project:{ _id:1,shop_id:1,category:1,shop_name:1,imageid:1,seller_uid:1}
                    },
                    { 
                      $group:{
                            _id:'$shop_id',
                            images:{$push:'$imageid'}
                            }
                    },             
                    { $project: { _id:0,shop_id: '$_id',images: { "$reverseArray": { $slice: [ "$images", -4 ] } } } },
                    {
                        $sort:{shop_id:-1}
                    },
                    // { $limit :shopLimit},           //trade off between getting deleted shops vs joing all shops and then limiting them     
                    {
                      $lookup:
                         {
                            from:'shop' ,
                            localField: 'shop_id',
                            foreignField: "shop_id",
                            as: "shops"
                        }
                    },       
                    { $limit :shopLimit},  
                    { $match: {shops: {$ne: []}} },
                    { $project: { _id:0,images:1 , shop: { $arrayElemAt: [ "$shops", 0 ] }, } },
                    { "$addFields": { "shop.product_images": "$images" } },
                    { "$replaceRoot": { "newRoot": "$shop" }  }
                ]).toArray(function(err, documents) {

                    // res.status(200).json({results:documents}); 
                    var len=documents.length;
                    var last_id="null";
                    if(documents.length) last_id=documents[len-1].shop_id;
                    console.log(last_id)
                    console.log(len)
                            
                    res.status(200).json({'count':len,'last_id':last_id,'results':documents});


                   });
    }


	
	documentRouter.get('/', getAllDocument);
	documentRouter.post('/updateAllDocument', updateAllDocument);
	documentRouter.post('/', postDocument);
	documentRouter.get('/:id', getDocumentById);
	documentRouter.patch('/:id', putDocument);
	documentRouter.put('/:id', putDocument);//change to put
	// documentRouter.delete('/', removeAllDocuments);
	documentRouter.delete('/:id', deleteDocument);
	documentRouter.get('/query/parameter/',queryDocument);
	documentRouter.get('/textsearch/q/', getDocumentByTextSearch);	
	documentRouter.post('/hardDelete/:id', hardDelete);
	// documentRouter.post('/categoryWiseProducts', categoryWiseProducts);
	documentRouter.post('/filterProducts', filterProductViaCategory);
	documentRouter.post('/outOfStockProducts', outOfStockProducts);
	documentRouter.post('/getLiveFilters', getLiveFilters);
	documentRouter.post('/applyFilter', applyFilter)
    documentRouter.post('/applySort', applySort)
    documentRouter.post('/findSimiliarShop', findSimiliarShop);

	/* GET suggestions */
	documentRouter.get('/suggest/:input', function (req, res, next) { 
	  elastic.getSuggestions(req.params.input).then(function (result) {res.json(result) });
	});

	/* GET search */
	documentRouter.get('/search/q/', function (req, res, next) {
	console.log(req.query.searchInput,req.query.suggestInput); 
	  elastic.searchES(res,req.query.searchInput,req.query.suggestInput);
	});

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