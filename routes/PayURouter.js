// 'use strict'
module.exports = function SetupRouter(CollectionName,database,DocType) {
	
	var express = require('express'),
		crypto = require('crypto'),
	    KEY = "JBZaLc",
	    SALT = "GQs7yium";

	var documentRouter = express.Router();

	var SuccessTransaction = function(req, res) {
		res.end(JSON.stringify(req.body));
	};

	var FailureTransaction = function(req, res) {
		// var data = "Data transfer failed ";
		// PayU.onFailure(data); // in case of Failure (furl);
		// res.status(201);
		res.end(JSON.stringify(req.body));		
	};

	//generate SHA512 key
	var getShaKey=function(req,res){
	    var shasum = crypto.createHash('sha512'),
	        reqData = req.body;
	        dataSequence = KEY + '|' + reqData.txnid + '|' + reqData.amount + '|' + reqData.productinfo + '|' + reqData.firstname + '|' + reqData.email + '|||||||||||' + SALT;
	        resultKey = shasum.update(dataSequence).digest('hex');
	   //console.log(dataSequence);
	    res.end(JSON.stringify({"data":resultKey}));
	};

	documentRouter.post('/success', SuccessTransaction);
	documentRouter.post('/failure', FailureTransaction);
	documentRouter.post('/getShaKey', getShaKey);
	
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