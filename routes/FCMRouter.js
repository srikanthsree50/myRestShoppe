// 'use strict'
module.exports = function SetupRouter(CollectionName,database,DocType) {
	
	var express = require('express');
	var url = require('url');
	var elastic = require('../elastic/elasticSearch');

	var documentRouter = express.Router();

	var mongodb = require("mongodb");
	var ObjectID = mongodb.ObjectID;

	var coll= database.collection(CollectionName);

	//add fcm token, user id will be passed, use that to find the document and add fcm token into fcmtoken array
	//it will return thr list of fcm token
	var addFCMToken = function(req, res) {
		var user_id = req.query.user_id;
		var token=req.query.token;

		console.log('Insert fcm token: find user with user id' +user_id);
		
		try { 
			var query={'_id': new ObjectID(user_id)};
			
			coll.findOneAndUpdate(query, { $addToSet: { 'fcm_token': token } },{returnOriginal:false},function(err, document_) {
												if (err) {
													 handleError(res, err, 'Failed to aInsert fcm token: find user with user id' +user_id);
												} 
												else {
													console.log(document_.value);
													res.status(200).json(document_.value);
												}
										  });
		} catch (e){
					handleError(res, e, 'Failed to aInsert fcm token: find user with user id' +user_id);
			}
	};

	var deleteFCMToken = function(req, res) {
		var user_id = req.query.user_id;
		var token=req.query.token;
		
		console.log('Delete fcm tokens: user id' +user_id);
		console.log(token);
		try { 
			var query={'_id': new ObjectID(user_id)};
			
			coll.findOneAndUpdate(query, { $pull:{ fcm_token: token }},{returnOriginal:false} ,function(err, document_) {
												if (err) {
													 handleError(res, err, 'Failed to delete fcm tokens: find user with user id' +user_id);
												} 
												else {	res.status(200).json(document_.value);
												}
										  });
		} catch (e){
					handleError(res, e, 'Failed to delete fcm tokens: find user with user id' +user_id);
			}
	};
 	//get fcm token list, user id will be passed to find the document and to return the list of fcm token
	var getFCMToken= function(req, res) {
		var user_id = req.query.user_id;
		
		console.log('Get fcm token: find user with user id' +user_id);
		
		try { 
			var query={'_id': new ObjectID(user_id)};
			
			coll.findOne(query, { 'fcm_token':1},function(err, document_) {
												if (err) {
													 handleError(res, err, 'Failed to aInsert fcm token: find user with user id' +user_id);
												} 
												else {	res.status(200).json(document_.fcm_token);
												}
										  });
		} catch (e){
					handleError(res, e, 'Failed to aInsert fcm token: find user with user id' +user_id);
			}
	};

	documentRouter.post('/addToken', addFCMToken);
	documentRouter.post('/getTokenList', getFCMToken);
	documentRouter.post('/deleteToken', deleteFCMToken);

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