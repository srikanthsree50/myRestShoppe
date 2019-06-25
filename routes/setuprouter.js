// 'use strict'
module.exports = function SetupRouter(validationSchemaPath,CollectionName,database,DocType) {
	
	var express = require('express');
	var url = require('url');
	var elastic = require('../elastic/elasticSearch');

	var validationSchema = require(validationSchemaPath);

	var documentRouter = express.Router();

	var mongodb = require("mongodb");
	var ObjectID = mongodb.ObjectID;

	var coll= database.collection(CollectionName);

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

		//validation check of input details
		req.checkBody(validationSchema);
		req.sanitizeBody('email').trim();
		var errors = req.validationErrors();
		if (errors) {
			res.send(errors);
			return;
		}

		//console.log('Adding document_: ' + JSON.stringify(document_));
		coll.insertOne(document_, {w:1}, function(err, result) {
				if (err) {
					handleError(res, err, "Failed to create new "+DocType);
				} else {
					res.status(201).json(result.ops[0]);
					//console.log('Adding document_: ' + JSON.stringify(result.ops[0]));
					//postES(document_)

					// if(DocType=="product") // comment this part if you dont want to add document to elasticsearch on every post request
					// 	elastic.addDocument(document_);//.then(function (result) { res.json(result) });
				}
			});
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
	var subdoc=0;
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
			 console.log(query);
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

	documentRouter.get('/', getAllDocument);
	documentRouter.post('/', postDocument);
	documentRouter.get('/:id', getDocumentById);
	documentRouter.patch('/:id', putDocument);
	documentRouter.put('/:id', putDocument);//change to put
	documentRouter.delete('/:id', deleteDocument);
	documentRouter.get('/query/parameter/',queryDocument);
	documentRouter.get('/textsearch/q/', getDocumentByTextSearch);

	/* GET suggestions */
	documentRouter.get('/suggest/:input', function (req, res, next) { 
	  elastic.getSuggestions(req.params.input).then(function (result) {res.json(result) });
	});

	/* GET search */
	documentRouter.get('/search/q/', function (req, res, next) {
	console.log(req.query.searchInput,req.query.suggestInput); 
	  elastic.searchES(req.query.searchInput,req.query.suggestInput).then(function (result) {res.json(result) });
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