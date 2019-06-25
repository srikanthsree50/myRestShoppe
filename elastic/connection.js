// var bonsai_url    = process.env.BONSAI_URL;
var elasticsearch = require('elasticsearch');
var client        = new elasticsearch.Client({
                            //host:'https://ic842rkv:t09td7txcpoco76x@boxwood-6179545.us-east-1.bonsaisearch.net',

                            //host:'https://elastic:vG1OJtP9Ojve2LX6ivE3sysJ@ce7ffc6103dc6b7268e7e86822132651.us-east-1.aws.found.io:9243',
                            host:'https://elastic:6ZD4F6bMkHO8xOOnq8a3WUI5@61e79e3379a57f8928f54d0202b22cca.us-east-1.aws.found.io:9243',
                            log: 'info' //use 'trace' if you want more details or 'info' if you dont want any details
                        });

// Test the connection...
// client.ping({
//     requestTimeout: 30000,
//     hello: "elasticsearch"
//   },
//   function (error) {
//     if (error) {
//       console.error('elasticsearch cluster is down!');
//     } else {
//       console.log('All is well');
//     }
//   }
// );

module.exports = client; 

