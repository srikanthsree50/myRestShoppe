module.exports = {

    'secret': 'ilovescotchyscotch',

    'collection_products': 'product',
    'collection_seller': 'seller', //this collection stores details about shopkeepers aadhar card details and phone no that will be used to likned with firebase 
    'collection_shop': 'shop',//this collection stores details about shop details mades by shopkeepers
    'collection_order':'order',
    'collection_fullorder':'fullorder',
    'collection_user':'user',//this collection stores details about customers using customer app
    // 'collection_fcmToken':'fcmToken',//not requird because fcm tokens will be added into user and seller document itself
    'collection_address':'address',
    'databaseName_local': 'productdb',
    'collection_category':'category',
    'collection_shopCategory':'shopCategory',
    'collection_filter':'filter',
    'collection_rating':'rating',
	'url_server': 'mongodb://heroku_9025ckpg:3iq9cpemvt7sq7qt48eqdhgsmf@ds149040.mlab.com:49040/heroku_9025ckpg',
	//'url_server':'mongodb://bhupendra7:ice123age456@ds157248.mlab.com:57248/shoplo', //amazone databse
	'url_local': 'mongodb://localhost:27017/productsdb'
};