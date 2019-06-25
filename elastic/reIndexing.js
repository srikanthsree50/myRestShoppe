var client = require('./connection.js');

//mongo db setting
var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;

var config = require('../config'); // get our config file
var ConnectionUrl=config.url_server;
var indexName = "products";

var coll,db;
var batchsize=12;

// Connect to the database
mongodb.MongoClient.connect(ConnectionUrl, function (err, database) { //process.env.MONGODB_URI
	if (err) {
		console.log(err);
		process.exit(1);
	}
	db=database;
	coll=db.collection(config.collection_products);
	StartIndexing();
	});    

var len=1,query={},count=1;

var StartIndexing = function() {
		//filtering : query,{name:1,imageid:1,seller_uid:1}
		coll.find(query).sort({ '_id': -1 }).limit(batchsize).toArray(function(err, documents) {
					if (err) {
						handleError(res, err, "Failed to get all "+DocType);
					} else {
						var len=documents.length;
						if(len)
							{
								last_id = documents[len-1]['_id'];
								query['_id']={$lt:new ObjectID(last_id)};
								//console.log(documents);
								console.log("batch no: "+ count++ +" size: "+len)
								indexToElasticSearch(documents);
								StartIndexing();
							}    
						else {
							console.log("reindexing done");
							db.close();
						}  
						
					}           
				});
	};

var indexToElasticSearch = function(documents){

	// Declare variable to contain body of JSON data for loading to ElasticSearch
	var br = [];

	function suggestName(name) {
		console.log(name)
		var sug={
                input: name.split(" ")
            };
		return sug; 
	}

	// Function to create body for loading to ElasticSearch
	function create_bulk (bulk_request) {
	
		for (i = 0; i < documents.length; i++) 
		{
			console.log("id "+documents[i]['_id'])
			var document=documents[i];
			// documents[i]['suggest']=suggestName(documents[i]['name']);
			var _id=documents[i]['_id'];
			var type_=document.shopType;
			// delete documents[i]['_id'];

			bulk_request.push({index: {_index: 'products', _type: type_, _id: _id}});
			bulk_request.push({
				name:document.name,
            	category:document.category,
            	imageid:document.imageid,
            	seller_uid:document.seller_uid
            	// description:document.description,
				// suggest:suggestName(document.name)
				}
			);	  
		}
								
		return bulk_request;
	  };
	  
	// Call function to get body for loading

	create_bulk(br); 
	// console.log(br);
	// Standard function of ElasticSearch to use bulk command
	client.bulk(
	{
		body : br
	}, function (err, resp) {
		if(err){console.log("err"+err);}
		else{
			//console.log("resp"+typeof resp);
		}
	  
	});

}