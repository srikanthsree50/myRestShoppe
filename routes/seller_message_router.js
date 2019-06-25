// 'use strict'
module.exports = function MessageRouter(CollectionName,database) {
	
  var async = require("async");
	var express = require('express');
	var messageRouter = express.Router();
	var FCM = require('fcm-node');
	var server_key = "AAAAR7t6afg:APA91bF9_Q7rcOZ-jTaIJg4derosIl8FsijniL40WVdMo10V-rB23Rz5-Sy2LgUYLLxc2_Q5JFVT8a_QTFhHaA88KPxkF4B-7NsByn_MwKjqPyq8MAZjRDOY7Og23WVKFQFrunGYyyeW";
	var fcm = new FCM(server_key);

  var mongodb = require("mongodb");
  var ObjectID = mongodb.ObjectID;
	var coll= database.collection(CollectionName);


 var  postMessage = function(req, res){
      var message =req.body;
      var query={'UID': message.to_id};

      coll.findOne(query, { 'fcm_token':1},function (err,user) {
          
            if(err){
              handleError(res,err);
            }else {

              if(user!=null){ 

                var isSent=false;//even if msg is send to one fcm token show send status

                for(i =0;i<user.fcm_token.length;i++)
                {
                    var token=user.fcm_token[i];
                    
                    var msg = {
                      "data": message,
                      to: token,
                      content_available: true,
                      priority: "high"
                    };

                    console.log("token no "+i+" "+token);
                    console.log("msg :"+msg);
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
                                  
                                                    database.collection('seller').findOneAndUpdate(query, { $pull:{ fcm_token: token }} ,function(err, document_) {
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

	console.log("seller message router setup");
	return messageRouter;

	// Generic error handler used by all endpoints.
	function handleError(res, err, code) {
		console.log("ERROR: " + err.message);
		//console.log("message: " + custommessage);
		console.log("stack: " + err.stack);
		res.status(code || 500).json({"error": err.message});
	}
};