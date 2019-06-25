'use strict'
module.exports = function SetupRouter(database,DocType) {

	var express = require('express');
	var url = require('url');
	var documentRouter = express.Router();
	var mongodb = require("mongodb");
	var ObjectID = mongodb.ObjectID;

	var coll= database.collection("shop");

	var indexName = "products";
	var request = require('request');
	var baseurl="https://elastic:6ZD4F6bMkHO8xOOnq8a3WUI5@61e79e3379a57f8928f54d0202b22cca.us-east-1.aws.found.io:9243";
	var size_limit=10,start_from=0;
	var searchproduct = function(req, res) {

		var searchInput =req.query.searchInput;
		var seller_uid =req.query.seller_uid;
		var limit =Number(req.query.limit);
		var from_  =Number(req.query.from);
		if(from_)start_from=from_;
		if(limit)size_limit=limit;
		
		// var suggestInput=req.query.suggestInput; 
		// console.log(searchInput);console.log(suggestInput);
	 
		var body=
		    { 
		    	"from" : start_from, "size" : size_limit,
				"query": { 
				    "bool": { 
				      "must": [
				        { "match": { "name":   searchInput       }} 
				      ],
				      "filter": [ 
				        { "term":  { "seller_uid": seller_uid }}
				      ]
				    }
				}

		        // "query": {
		        //     "match": {
		        //       "name": searchInput
		        //     }
		        // },
		        // "_source": "name",
		        // "suggest": {
		        //     "doc-suggest" : {
		        //         "prefix" : suggestInput,
		        //         "completion" : {
		        //             "field" : "suggest",
		        //             "fuzzy" : {
		        //                 "fuzziness" : 2
		        //             }
		        //         }
		        //     }
		        // }
		    };

		   
	    request.get({
	          url:baseurl+'/'+indexName+'/_search',
	          headers: {'content-type' : 'application/json'},
	          json: body
	        }, function(error, response, body){
	            if(error)res.status(200).json(error);
	            else 
	            {
		            try { 
		            	res.status(200).json({results:body.hits.hits});
		            } catch(e) {	
						res.status(200).json({results:[]});
					    console.log(e);
					}
				}
	        });
	    

	};
	
	var directShopSearch = function(req, res) {

		var searchInput =req.query.searchInput;
		console.log(searchInput);

		var body=
			    {
				  "query": {
				    "match": {
				      "name": searchInput
				    }
				  },
				  "size": 0,
				  "aggs":{
				    "shops" : {
				      "terms":{
				        "field": "seller_uid",
				        "size": 10,
				        "order": { "max_score": "desc" }    
				         },
				       "aggs":{
				         "shops_docs":{
				           "top_hits":{
				             "size":4,
             				 "_source": ["imageid"]
				           }
				         },
				         "max_score" : {          
								      		"max": {            
								      			"script": "_score"          
								      		}        
								      	}
				       }    
				    }
				  }
				};

	    request.get({
	          url:baseurl+'/'+indexName+'/_search',
	          headers: {'content-type' : 'application/json'},
	          json: body
	        }, function(error, response, body){
	            if(error)res.status(200).json(error);
	            else {

	            
	     			try {
			            	var buckets=body.aggregations.shops.buckets;
			            	
			            	var uids=[],shopmap={};
			            	for(var i=0;i<buckets.length;i++){
			            		var images=[],uid;
			  					uid=buckets[i].key;
			  					uids.push(uid);

			  					var hits=buckets[i].shops_docs.hits.hits;
			  					for(var j=0;j<hits.length;j++)
			            			images.push(hits[j]._source.imageid);

			            		shopmap[uid]=images;
			            	}

			            	// res.status(200).json(shops);
			            	coll.aggregate([ 
							{
								"$match": { 'UID': { '$in': uids }  }
							}
							]).toArray(function(err, documents) {
								if (err) {
										handleError(res, err, "Failed to get all "+DocType);
									} else {
										console.log(uids);
										for(var k=0;k<documents.length;k++){
											documents[k]['product_images']=shopmap[documents[k]['UID']]
										}
										res.status(200).json({count:documents.length,'results':documents});
										
										}	
								});

					} catch(e) {	
									res.status(200).json({count:0,results:[]});
								    console.log(e);
								}


	            }
	        });

	};

	//customer side: get catgeory division when someone searches
	var searchShop = function(req, res) {

		var searchInput =req.query.searchInput;
		console.log(searchInput);
	 
		var body=
		    {
				    "query": {
				        "match" : {
				            "name" : {
				                "query" : searchInput
				            }
				        }
				    },
				    "size":0,
				    "aggs":{
				    "shops" : {
				      "terms":{
				        "script":"doc.category.size()==3?doc.category[2]+doc.category[1]+doc.category[0]:doc.category[1]+doc.category[0]",
				        "order": { "max_score": "desc" },
				        "size": 10    
				         },
				       "aggs":{
				         "shops_docs":{
				           "top_hits":{
				             "size": 1
				           }
				         },
				         "max_score" : {          
								      		"max": {            
								      			"script": "_score"          
								      		}        
								      	}
				       }    
				    }
				  }
			 

			};

	    request.get({
	          url:baseurl+'/'+indexName+'/_search',
	          headers: {'content-type' : 'application/json'},
	          json: body
	        }, function(error, response, body){
	            if(error)res.status(200).json(error);
	            else{
	            	var sources=[];

	            	try{
			            	var buckets=body.aggregations.shops.buckets;
			            	for(var i=0;i<buckets.length;i++){
			            		var source=buckets[i].shops_docs.hits.hits[0]._source;
			            		sources.push(source);
			            		source['shopType']=buckets[i].shops_docs.hits.hits[0]._type;
			            	}
			            	 res.status(200).json({results:sources});

	            	} catch(e) {	
									res.status(200).json({count:0,results:[]});
								    console.log(e);
								}
	            }
	        });

	};

	var deleteIndex = function(req, res) {
	    request.delete({
	          url:baseurl+'/'+indexName,
	          headers: {'content-type' : 'application/json'}
	        }, function(error, response, body){
	            if(error)res.status(200).json(error);
	            else res.status(200).json(body);
	        });

	};


	//curl -XGET 'localhost:9200/twitter/_mapping/tweet?pretty'
	var getMapping = function(req, res) {
		var type=req.query.type;
	    request.get({
	          url:baseurl+'/'+indexName+'/_mapping/'+type,
	          headers: {'content-type' : 'application/json'}
	        }, function(error, response, body){
	            if(error)res.status(200).json(error);
	            else res.status(200).json(body);
	        });

	};

	//GET _all/_mapping
	var getAllMapping = function(req, res) {
	    request.get({
	          url:baseurl+'/_all/_mapping',
	          headers: {'content-type' : 'application/json'}
	        }, function(error, response, body){
	            if(error)res.status(200).json(error);
	            else res.status(200).json(body);
	        });

	};

	var setSetting = function(req, res) {
		
		var body= {
				"settings": {
					"analysis": {
						"filter": {
							"custom_ngram": {
								"type": "nGram",
								"min_gram": 2,
								"max_gram": 4
							},
							"custom_edge_ngram":{
								"type": "edgeNGram",
								"min_gram": 2,
								"max_gram": 4    
							}
						},
						"analyzer": {
							"name_analyzer": {
								"type": "custom",
								"tokenizer": "standard",
								"filter": ["custom_ngram","lowercase"]
							},
							"name_edge_analyzer": {
								"type": "custom",
								"tokenizer": "standard",
								"filter": ["custom_edge_ngram","lowercase"]
							}           
						}
					}
			},
			"mappings": {
			    "_default_": {
			            "properties": {
			                "name": {
			                  "type": "text",
			                  "analyzer": "name_analyzer",
			                  "search_analyzer": "name_analyzer"
			                },
			                "seller_uid": {
			                  "type": "keyword"
			                },
			                "category": {
			                  "type": "keyword"
			                },
			                "imageid": {
			                  "type": "keyword"
			                }
			                // "suggest": {
			                //     "type": "completion",
			                //     "analyzer": "standard",
			                //     "search_analyzer": "standard"
			                //         } 
			             }
			     }
			}
		};
		
		request.put({
		  url:baseurl+'/'+indexName,
		  headers: {'content-type' : 'application/json'},
		  json:    body
		}, function(error, response, body){
			 if(error)res.status(200).json(error);
	         else res.status(200).json(body);
		});


	};

	//Deleting a Document
	//curl -XDELETE 'localhost:9200/website/blog/123?pretty'
	// var deleteDocument = function(req, res) {
	// 	var type=req.query.type;
	// 	var id=req.query.id;
	//     request.delete({
	//           url:baseurl+'/'+indexName+'/'+type+'/'+id,
	//           headers: {'content-type' : 'application/json'}
	//         }, function(error, response, body){
	//             if(error)res.status(200).json(error);
	//             else res.status(200).json(body);
	//         });

	// };

	//get-settings
	//GET /twitter/_settings
	var getSetting = function(req, res) {
		    request.get({
		          url:baseurl+'/'+indexName+'/_settings',
		          headers: {'content-type' : 'application/json'}
		        }, function(error, response, body){
		            if(error)res.status(200).json(error);
		            else res.status(200).json(body);
		        });

	};

	//GET /_all/_settings
	var getAllSetting = function(req, res) {
		    request.get({
		          url:baseurl+'/_all/_settings',
		          headers: {'content-type' : 'application/json'}
		        }, function(error, response, body){
		            if(error)res.status(200).json(error);
		            else res.status(200).json(body);
		        });

	};

	
   

	documentRouter.post('/directShopSearch/',directShopSearch)
	documentRouter.post('/search/',searchproduct);
	documentRouter.post('/searchShop/',searchShop); 
	documentRouter.post('/deleteIndex/',deleteIndex); 
	documentRouter.post('/getAllMapping/',getAllMapping);
	documentRouter.post('/getMapping/',getMapping);
	// documentRouter.post('/deleteDoc/',deleteDocument); 
	documentRouter.post('/getSetting/',getSetting);
	documentRouter.post('/setSetting/',setSetting);
	documentRouter.post('/getAllSetting/',getAllSetting); 


	console.log("Router setup for "+DocType);
	return documentRouter;

};
