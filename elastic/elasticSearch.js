var client = require('./connection.js');

var indexName = "products";
var request = require('request');
var baseurl= "https://elastic:9OVVDfVCFXDZVYZTpwhX7cYP@a477f633e0d49252246da7dfee07f8e6.us-east-1.aws.found.io:9243";//"https://elastic:vG1OJtP9Ojve2LX6ivE3sysJ@ce7ffc6103dc6b7268e7e86822132651.us-east-1.aws.found.io:9243";


function suggestName(name) {
        console.log(name)
        var sug={
                input: name.split(" ")
            };
        return sug; 
    }

function addDocument(document) {
    var name_=document.name;
    var type_=document.shopType;
    var _id=document._id.toString();  
    client.index({
        index: indexName,
        type: type_,
        id:_id,
        body: {
            name: name_,
            category:document.category,
            imageid:document.imageid,
            seller_uid:document.seller_uid
            // description:document.description,
            // suggest:suggestName(document.name)
            }
        }, function (error, response) {
            //console.log("response"+response["docsuggest"][0]);
            //return response;
        });
}
exports.addDocument = addDocument;

 //DELETE /products/Footwear/59e5d42879d92400043c50b7
var deleteDocument = function(shopType, id) {
    console.log(indexName)
      console.log(shopType)
        console.log(id)
    client.delete({
          index: indexName,
          type: shopType,
          id: id
        }, function (error, response) {
          // ...
          console.log(response)
        });    

    };
exports.deleteDocument = deleteDocument;

function getSuggestions(input) {  
    //console.log(input);
    const body ={
            //source: 'name',
            docsuggest: {
                prefix: input,
                completion: {
                    field: "suggest",
                    fuzzy: {"fuzziness" : 2}
                }
            }
        };
    return client.suggest({index: indexName, body: body});
    }
   
exports.getSuggestions = getSuggestions;

function searchES(res,searchInput,suggestInput) {  

    var body=
    { 
        "query": {
            "match": {
              "name": searchInput
            }
        },
        "_source": "name",
        "suggest": {
            "doc-suggest" : {
                "prefix" : suggestInput,
                "completion" : {
                    "field" : "suggest",
                    "fuzzy" : {
                        "fuzziness" : 2
                    }
                }
            }
        }
    };

    request.get({
          url:baseurl+'/products/_search',
          headers: {'content-type' : 'application/json'},
          json: body
        }, function(error, response, body){
            console.log('error:', error); // Print the error if one occurred 
            console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received 
            //console.log('body:', body); // Print the HTML for the Google homepage. 
            if(error)res.status(200).json(error);
            else res.status(200).json(body);
        });
}

exports.searchES = searchES;