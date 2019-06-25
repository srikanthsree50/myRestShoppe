// 'use strict'
module.exports = function MessageRouter(CollectionName,database) {
	
	var express = require('express');
	var messageRouter = express.Router();
	var FCM = require('fcm-node');
	var server_key = "AAAAN-PxcpQ:APA91bF0tuNR7PZx7nAB6sJsRgl8-bj8cah5T5hyASqy6tTsNhInChGC8IT1fdJ2ouSn05gj_Pqsweqj_EZc9z3IkLMWBzVD47-B8yZuKZ13u4L-Ck2Ym7zpi3sxWZOe8O29B1UdLkXZ"
	var fcm = new FCM(server_key);
	var server_key ="";
	var coll= database.collection(CollectionName);


	//shift this pusher to seperate file
/*	var Pusher = require('pusher');

	var pusher = new Pusher({
	  appId: '328312',
	  key: 'b4b398faea855591c3ae',
	  secret: '29e87a60df2939293f2a',
	  cluster: 'ap2',
	  encrypted: true
	});

	var postMessage= function(req, res){
	  var message =req.body;
	  //console.log(JSON.stringify(message));
	  pusher.trigger('product-channel', 'product-event', message);
	  res.json({success: 200});
	};

	var postNotification= function(req, res){
	  var fcm =req.body;
	  //console.log(JSON.stringify(notification));
	  pusher.notify(['donuts'], {
	  	fcm: fcm
	  });

	  res.json({success: 200});

	};*/



	var postMessage= function(req, res){
	  var message =req.body;
	  sendOpponentMessage(message,res);
	};



 	function  sendStatusMessage(message,res) {

      message.status = "sent";

      coll.findOne({_id:message.from},function (err,user) {    	

        if(err){
          handleError(res,err);
        }else {
          if(user!=null){            
              
			var msg = {
                "data": message,
                to: user.fcm_token,
                content_available: true,
                priority: "high"
              };
            fcm.send(msg, function (err, response) {
                if (err) { handleError(res,err);}
              });

          }else {
            console.log("source - can't find the specific user when trying to sending msg_status");
          }
        }
      });

    }

    function  sendOpponentMessage(message,res) {

      coll.findOne({_id: message.to},function (err,user) {

        if(err){
          handleError(res,err);
        }else {
          if(user!=null){   

              var msg = {
                "data": message,
                to: user.fcm_token,
                content_available: true,
                priority: "high"
              };
              fcm.send(msg, function (err, response) {
                if (err) { handleError(res,err);} else {
                  //sendStatusMessage(message);
                  message.status = "sent";
                  res.status(201).json(message);
                }
              });

            
            }else {
            console.log("can't find the specific user when trying to personal message");
          }            
          }
      	}

      })};

   

	messageRouter.post('/message', postMessage);
	//messageRouter.post('/notify',postNotification)

	console.log("Router setup for messaging");
	return messageRouter;

	// Generic error handler used by all endpoints.
	function handleError(res, err, code) {
		console.log("ERROR: " + err.message);
		console.log("message: " + custommessage);
		console.log("stack: " + err.stack);
		res.status(code || 500).json({"error": err.message});
	}
};