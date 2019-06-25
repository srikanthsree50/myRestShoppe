// 'use strict'
module.exports = function MessageRouter(CollectionName,database) {
	
  var async = require("async");
	var express = require('express');
	var messageRouter = express.Router();
	var FCM = require('fcm-node');
	var server_key = "AAAAVu7LMhc:APA91bF93-OIIyjJrrHQJ331NUhmD6edUeo-zf-_uUx-g4E7cMi2I5cKqjyngYxiAQwsfrf27OaQTLFKLBfezt5kXEkPCql24GCgY8LmL1sZ1U_dB5CfKyYgMjzlfGW4ty-sjKERi_tT";
	var fcm = new FCM(server_key);

  var mongodb = require("mongodb");
  var ObjectID = mongodb.ObjectID;
	var coll= database.collection(CollectionName);


  var postMessage= function(req, res){
      var message =req.body;
      var query={'_id': new ObjectID(message.to_id)};

      coll.findOne(query, { 'fcm_token':1},function (err,user) {
            console.log("user id "+message.to_id)
            console.log(user.fcm_token)
            if(err){
              handleError(res,err);
            }else {

              if(user!=null){ 

                var isSent=false;//even if msg is send to one fcm token show send status

                for(i =0;i<user.fcm_token.length;i++)
                {
                    var token=user.fcm_token[i];
                    console.log("token no "+i+" "+token);
                    var msg = {
                      "data": message,
                      to: token,
                      content_available: true,
                      priority: "high"
                    };

                    fcmsend(msg,message,query,token,res);     
                          
                }


              }
               else {
                    console.log("can't find the specific user when trying to personal message");
                    }  
            }
      });
  };

  var fcmsend =function(msg,message,query,token,res){

                fcm.send(msg, function (err, response) {
                                                  if (err) { 
                                                    // handleError(res,err);
                                                    // console.log("user token "+token);
                                                    console.log("error ",err);
                                  
                                                    database.collection('user').findOneAndUpdate(query, { $pull:{ fcm_token: token }} ,function(err, document_) {
                                                        if (err) {
                                                           console.log("error in removing the token"+token);
                                                        } 
                                                        else { 
                                                         console.log("removed the token successfully"+token);
                                                        }
                                                      });

                                                    } else {
                                                              try {
                                                                  message.status = "sent";
                                                                  console.log(" sent :", message);
                                                                  res.status(201).json(message);
                                                                }catch (e){
                                                                  console.log(e);
                                                                }

                                                          }
                                                  
                                                });
              };

	function testMessage(req,res){

		var message = req.body;
		var msg = {
                "data": message,
                to: message.fcm_token,
                content_available: true,
                priority: "high"
              };

        console.log(msg);

       	fcm.send(msg, function (err, response) {
            if (err) { console.log(err)} else {
              message.status = "sent";
              console.log("test message sent")
              res.status(201).json(message);
            }
         });

	}

	messageRouter.post('/', postMessage);
	messageRouter.post('/test',testMessage)

	console.log("user message router setup");
	return messageRouter;

	// Generic error handler used by all endpoints.
	function handleError(res, err, code) {
		console.log("ERROR: " + err.message);
		//console.log("message: " + custommessage);
		console.log("stack: " + err.stack);
		res.status(code || 500).json({"error": err.message});
	}
};