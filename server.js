var local = process.argv.slice(2);
var express = require('express');
var cors = require('cors');
var app = express();
app.use(cors());

// var compression = require('compression');
var validator = require('express-validator');
var bodyParser = require('body-parser');
var basicAuth = require('express-basic-auth')
var async = require('async');
// app.use(compression({threshold : 0}))

// app.use(bodyParser.json());// parse application/json
// app.use(bodyParser.urlencoded({ extended: true }));// parse application/x-www-form-urlencoded
// app.use(validator());
 
// app.use(basicAuth({
// 	// users: { 'bhupendra7': 'ice123age456' },
// 	authorizer: myAsyncAuthorizer,
// 	authorizeAsync: true,
// 	unauthorizedResponse: getUnauthorizedResponse,
// 	challenge: true,
// 	realm: 'Imb4T3st4pp'
// }))


function parallel(middlewares) {
  return function (req, res, next) {
    async.each(middlewares, function (mw, cb) {
      mw(req, res, cb);
    }, next);
  };
}

app.use(parallel(

	[
		// compression(),
		bodyParser.json(),bodyParser.urlencoded({ extended: true }),validator(),
		basicAuth({
		// users: { 'colony7': 'ice123age456' },
		authorizer: myAsyncAuthorizer,
		authorizeAsync: true,
		unauthorizedResponse: getUnauthorizedResponse,
		challenge: true,
		realm: 'Imb4T3st4pp'
		})

	]
	
));

var config = require('./config'); // get our config file
var ConnectionUrl=config.url_server;
if(local=="local")ConnectionUrl=config.url_local;

console.log(ConnectionUrl);

var productRouter,sellerRouter,shopRouter,orderRouter,userRouter,fullOrderRouter,addressRouter,
			fcmUserRouter,fcmSellerRouter,userMessageRouter,sellerMessageRouter,PayURouter,orderProcessingRouter,
			CategoryRouter,IndividualShopCategory,ElasticRouter,FilterRouter,RatingRouter;

var mongodb = require("mongodb");

// Create a database variable outside of the database connection callback to reuse the connection pool in your app.
var db;
var start = (new Date()).getTime();
// Connect to the database before starting the application server.
mongodb.MongoClient.connect(ConnectionUrl, function (err, database) { //process.env.MONGODB_URI

	if (err) {
	console.log(err);
	process.exit(1);
	}

	database.collection(config.collection_user).ensureIndex({ "cart.product.product_id": 1 });
	// Save database object from the callback for reuse.
	db = database;
	
	// var authenticate=require('./authentication');
	// app.use('/authenticate/:uid',authenticate.tokenauthentication(config.collection_seller,db,"seller"));
	// app.use(authenticate.tokenauthenticationmiddleware());
	console.log("Database connection ready for products");
	productRouter=require('./routes/ProductRouter')('../schema/schema_product',config.collection_products,config.collection_filter,config.collection_shopCategory,db,"product");
	shopRouter=require('./routes/ShopRouter')(config.collection_shop,config.collection_shopCategory,db,"shop");
	
	orderRouter=require('./routes/OrderRouter')(config.collection_order,config.collection_seller,config.collection_user,db,"order");
	orderProcessingRouter=require('./routes/OrderProcessingRouter')(config.collection_order,config.collection_seller,config.collection_user,db,"orderProcessing");
	fullOrderRouter=require('./routes/BasicRouter')(config.collection_fullorder,db,"fullorder");
	addressRouter=require('./routes/AddressRouter')(config.collection_address,db,"address");

	userRouter=require('./routes/UserRouter')(config.collection_user,config.collection_shop,db,"user");
	sellerRouter=require('./routes/SellerRouter')('../schema/schema_seller',config.collection_seller,db,"seller");
	
	userMessageRouter=require('./routes/user_message_router')(config.collection_user,db);
	sellerMessageRouter=require('./routes/seller_message_router')(config.collection_seller,db);

	fcmUserRouter=require('./routes/FCMRouter')(config.collection_user,db,"fcmUser");
	fcmSellerRouter=require('./routes/FCMRouter')(config.collection_seller,db,"fcmSeller");

	PayURouter=require('./routes/PayURouter')(config.collection_fullorder,db,"PayU Transactions");

	CategoryRouter=require('./routes/CategoryRouter')(config.collection_category,db,"Category");
	IndividualShopCategory=require('./routes/IndividualShopCategory')(config.collection_shopCategory,config.collection_filter,config.collection_products,db,"IndividualshopCategory");
	ElasticRouter=require('./routes/ElasticRouter')(db,"ElasticSearch");
	FilterRouter=require('./routes/FilterRouter')(config.collection_filter,config.collection_shopCategory,config.collection_products,db,"FilterRouter");
	RatingRouter=require('./routes/RatingRouter')(config.collection_rating,db,"RatingRouter");
	

	var stop = (new Date()).getTime();
  	console.log('Took this long: ',(stop-start));
	app.use('/products/', productRouter);
	app.use('/sellers/', sellerRouter);
	app.use('/shops/', shopRouter);
	app.use('/user/',userRouter);
	app.use('/order/',orderRouter);
	app.use('/orderProcessing/',orderProcessingRouter);
	app.use('/fullorder/',fullOrderRouter);
	app.use('/address/',addressRouter);
	app.use('/fcmUser/',fcmUserRouter);
	app.use('/fcmSeller/',fcmSellerRouter);
	app.use('/userMessage/',userMessageRouter);
	app.use('/sellerMessage/',sellerMessageRouter);
	app.use('/payU/',PayURouter);
	app.use('/category/',CategoryRouter);
	app.use('/individualShopCategory/',IndividualShopCategory);
	app.use('/elastic/',ElasticRouter);
	app.use('/filter/',FilterRouter);
	app.use('/rating/',RatingRouter);
	

	// Initialize the app.
	var server = app.listen(process.env.PORT || 8080, function () {
	var port = server.address().port;
	console.log("App now running on port", port);


	});
});


function myAsyncAuthorizer(username, password, cb) {

	if(username==="colony7" && password==="ice123age456")
		return cb(null, true)
	else
		return cb(null, false)

}

function getUnauthorizedResponse(req) {
	return req.auth ?
		('Credentials ' + req.auth.user + ':' + req.auth.password + ' rejected'):
		'No credentials provided'
}


// "mongodb": "^2.2.25", this is native drivers not the mongodb database whose verisonis 3.4.3
// pagination
// error handling
// aysnc call
// compressio

// API Key:7120819b-8f07-41fc-971a-ffc5a5649150
// Description:api for products