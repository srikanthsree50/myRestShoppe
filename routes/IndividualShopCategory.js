 // 'use strict'
module.exports = function SetupRouter(CollectionName,CollectionFilter,CollectionProduct,database,DocType) {
    
    var async = require("async");
    var express = require('express');
    var url = require('url');
    var elastic = require('../elastic/elasticSearch');
    var documentRouter = express.Router();
    var mongodb = require("mongodb");
    var ObjectID = mongodb.ObjectID;
    var coll= database.collection(CollectionName);
    var collFilter= database.collection(CollectionFilter);
    var collProduct= database.collection(CollectionProduct);

    
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

    var makeCategoryDivision =  function(req, res) {
        var shop_id=req.query.shop_id;
        // console.log("yes")
        // try { 

        var cursor=coll.aggregate([
                    
                        {
                            "$match": {"shop_id":shop_id}
                        },
                        {   
                            $project: { "category":1    }   
                        },
                        {   $unwind:'$category' },
                        {   $group:{
                            _id:{ name: "$category.level1.name" },
                             // _id:{level1:'$category.level1.name'},
                            level1_endpoint:{ $first: "$category.level1.endpoint" }, 
                            level2:{$push:'$category.level2'},
                            level3:{$push:'$category.level3'}
                            }
                        }

                ]);

        cursor.toArray(function(err, docs) {
                // console.log("docs"+docs);
                var category_level1=[],category_level2=[],category_level3=[];

                docs.forEach(function(doc){
                    category_level1.push({'name':doc._id.name,endpoint:doc.level1_endpoint});
                    category_level2.push(doc.level2);
                    // category_level3.push(doc.level3);
                    category_level3.push.apply(category_level3, doc.level3);
                });
                res.status(200).json({category_level1:category_level1,category_level2:category_level2,category_level3:category_level3});
            });
        // } catch (e){
        //            // console.log(e);
        //     }    
    };

     var addCategory =  function(req, res) {
        var shop_id=req.query.shop_id;
        var category=JSON.parse(req.query.category);
        var imageid=req.query.imageid;
        var categories=[];
        category.forEach(function(item){
            categories.push( item);
        });

        var filters=req.body;
        // var name=filter.name;
        // var type=filter.type;
        // var value=filter.value;
        // console.log(name+type+value);

        console.log(shop_id)
        console.log(category);
        console.log(imageid);
        var category_image=imageid.split(",")[0];
        console.log(category_image);
        var id3=new ObjectID();


        coll.aggregate([
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

                        console.log("inserting new category division");
                    
                        var newcategory={
                            _id:new ObjectID(),
                            level1:{_id:new ObjectID(),name:category[0],endpoint:category_image},
                            level2:{_id:new ObjectID(),name:category[1],endpoint:category_image},
                            level3:[{_id:id3,name:category[2],endpoint:category_image,count:1}]  
                        };
                        console.log(newcategory)

                        coll.updateOne({'shop_id':shop_id},{ $addToSet: { 'category': newcategory}, $set:{last_update_date:new Date()},$push: { images: { $each: [ category_image ], $slice: -4 }  }   }, function(err, document_) {
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
                            
                            console.log("insert just new level3");
                            var search_level2={'shop_id': shop_id,'category.level1._id':level1_id,'category.level2._id':level2_id};
                            coll.updateOne(search_level2,{ $push: { 'category.$.level3': {_id:id3,name:category[2],endpoint:category_image,count:1}, images: { $each: [ category_image ], $slice: -4  } },$set:{last_update_date:new Date()} }, function(err, document_) {
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
                            // coll.updateOne(search_level2,{ $set: {'$endpoint' : category_image} }, function(err, document_) {
                            //                                                         if (err) {
                            //                                                              handleError(res, err, 'Failed');
                            //                                                         } else {
                            //                                                             res.status(200).json(document_);
                            //                                                         }
                            //                                                   });
                    
                            var bulk = coll.initializeOrderedBulkOp();
                            bulk.find(search_level2).updateOne({ "$pull": { 'category.$.level3':{'name': category[2] } } });
                            bulk.find(search_level2).updateOne({ "$addToSet": { "category.$.level3":  {_id:new ObjectID(level3_id[pos]),name:category[2],endpoint:category_image,count:count[pos]+1} } ,$push: { images: { $each: [ category_image ], $slice: -4 }  }  });
            
                            
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

    var categoryWiseProducts =  function(req, res) {
        var categoryWiseLimit=4;
        var shop_id=req.query.shop_id;
        var last_id=req.query.last_id;
        var limit=Number(req.query.limit);
        if(limit)categoryWiseLimit=limit;

        var contidition={};
        if(last_id)contidition={ "_id": { $lt: new ObjectID(last_id) }  };

        coll.aggregate([
                    {
                        "$match": {
                          "shop_id":shop_id
                        }
                    },
                    {   $unwind:'$category'  },
                    {
                        $project:{ _id:'$category._id',level1:'$category.level1.name',level2:'$category.level2.name'}
                    },
                    {   $sort : { '_id' :-1 }  },
                    {
                        $match: contidition
                    },
                    {'$limit':categoryWiseLimit}
                ]).toArray(function(err, doc) {
                    var len=doc.length;
                    var last_id="null";
                    if(len)last_id=doc[len-1]._id;
                    // res.status(200).json({last_id:last_id,results:doc});
                    // return;

                    // var query=[];
                    // for(var i=0;i<len;i++){
                    //     // console.log(doc[i].level1+" "+doc[i].level2);
                    //     query.push( { $and: [ {'category.0':doc[i].level1},{ 'category.1':doc[i].level2 } ] } );
                    // }    
                    // query={ $or :query};
                    // console.log(query);

                    var facetlist={};
                    for(var i=0;i<len;i++){

                        facetlist["products_"+i]=
                                        [    
                                            {                               
                                                "$match":{ $and: [ {'category.0':doc[i].level1},{ 'category.1':doc[i].level2 } ] }
                                            },
                                            {
                                                $limit:3
                                            }
                                        ]
                            };
                    // res.status(200).json(facetlist);
                    collProduct.aggregate([
                                            {
                                                "$match": {"shop_id":shop_id}
                                            },
                                            {
                                                "$sort":{last_update:-1}
                                            },
                                            {   $facet:facetlist}
                                        ]).toArray(function(err, results) {
                                        
                                            for(var i=0;i<len;i++){
                                                doc[i]['products']=results[0]['products_'+i];
                                            }

                                            res.status(200).json({count:doc.length,last_id:last_id,results:doc});
                                    });
         

                });
    };

     var findSimiliarShop =  function(req, res) {
        var shopLimit=4;
        var level1=req.query.level1;
        var level2=req.query.level2;
        var level3=req.query.level3;
        var shopType=req.query.shopType;
        var last_id=req.query.last_id;
        var limit=Number(req.query.limit);
        if(limit)shopLimit=limit;

        console.log(shopLimit)

        var condition={};
        if(last_id)condition["shop_id"]= { $lt: last_id };
        var query={},shopquery={};
        if(level1)query['category.level1.name']=level1;
        if (level2)query['category.level2.name']=level2;
        if(level3)query['category.level3.name']=level3;
        if(shopType)shopquery['shopType']=shopType;
        console.log(query)
        console.log(shopquery)
        console.log(condition)

        coll.aggregate([ 
                    {
                        $sort:{shop_id:-1}
                    },
                    {
                        $match: condition
                    },
                    {
                        "$match": shopquery
                    },
                    {
                        "$match": query
                    },
                    { $limit :shopLimit},
                    {
                        $project:{shop_id:1,_id:0}
                    },
                    {
                      $lookup:
                         {
                            from:'shop' ,
                            localField: 'shop_id',
                            foreignField: "shop_id",
                            as: "shop"
                        }
                    }, 
                    {
                      $lookup:
                         {
                            from:'product' ,
                            localField: 'shop_id',
                            foreignField: "shop_id",
                            as: "products"
                        }
                    },  
                    { $project: { _id:0,shop:{ $arrayElemAt: [ "$shop", 0 ] },'product_images': { "$reverseArray": { $slice: [ "$products.imageid", -4 ] } } } },
                    { "$addFields": { "shop.product_images": "$product_images" } },
                    { "$replaceRoot": { "newRoot": '$shop' }  }
                ]).toArray(function(err, documents) {

                    // res.status(200).json({results:documents}); 
                    var len=documents.length;
                    var last_id="null";
                    if(documents.length) last_id=documents[len-1].shop_id;
                    // console.log(last_id)
                    // console.log(len)
                            
                    res.status(200).json({'count':len,'last_id':last_id,'results':documents});

                   });
    }
     
    documentRouter.get('/', getAllDocument);
    documentRouter.delete('/', removeAllDocuments);
    documentRouter.post('/', postDocument);
    documentRouter.get('/:id', getDocumentById);
    documentRouter.put('/:id', putDocument);
    documentRouter.delete('/:id', deleteDocument);

    documentRouter.post('/addCategory', addCategory);
    documentRouter.post('/division', makeCategoryDivision);
    documentRouter.post('/categoryWiseProducts', categoryWiseProducts);
    documentRouter.post('/findSimiliarShop', findSimiliarShop);

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
