 var jwt    = require('jsonwebtoken');
 var secretcode='ilovescotchyscotch';
module.exports ={
 'tokenauthentication': function(CollectionName,database,DocType) {

  var coll= database.collection(CollectionName);

  var checkUserByUID = function(req, res) {
  var uid = req.params.uid;
  console.log('tokenauthentication user: ' + uid);
    
  coll.findOne({'UID':uid}, function(err, user) {
    if (err) {
       res.json({Error:"Failed to get"+ DocType + " " + uid});
      } else {
       // if user is found  create a token
          var token = jwt.sign(user,secretcode, {
            expiresIn: 86400 // expires in 24 hours
          });

          // return the information including token as JSON
          res.json({
            success: true,
            message: 'Enjoy your token!',
            token: token
          });
      }
    });
   
  };

return checkUserByUID;
},

// route middleware to verify a token
'tokenauthenticationmiddleware':function(){
    return function(req, res, next) {
      // check header or url parameters or post parameters for token
      var token = req.body.token || req.query.token || req.headers['x-access-token'];

      // decode token
      if (token) {

        // verifies secret and checks exp
        jwt.verify(token, secretcode, function(err, decoded) {      
          if (err) {
            return res.json({ success: false, message: 'Failed to authenticate token.' });    
          } else {
            // if everything is good, save to request for use in other routes
            req.decoded = decoded;    
            next();
          }
        });

      } else {

        // if there is no token
        // return an error
        return res.status(403).send({ 
            success: false, 
            message: 'No token provided.' 
        });
        
      }
  };
}
}