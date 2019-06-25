
GET products/_search
{
  "from" : 40, "size" : 5,
  "query": {
    "match_all": {}
  }
}
#spelling suggest
POST products/_search
{
  "query": {
    "match": {
      "name": "silk"
    }
  },
  "suggest": {
    "my-suggestion": {
      "text": "ndnd",
      "term": {
        "field": "name"
      }
    }
  }
}

GET products/Footwear/_search/
{
  "query": {
    "match": {
      "name": "clot"
    }
  }
}

GET products/_search/
{
  "query": { 
    "bool": { 
      "must": [
        { "match": { "name":   "bzbz"        }} 
      ],
      "filter": [ 
        { "term":  { "seller_uid": "427154884203" }}
      ]
    }
  }
}

GET products/_search/
{
  "query": {
    "match": {
      "name": "bzbz"
    }
  },
  "size": 0,
  "aggs":{
    "shops" : {
      "terms":{
        "field": "seller_uid",
        "size": 10,
        "order": { "max_score": "desc" }    
         },
       "aggs":{
         "shops_docs":{
           "top_hits":{
             "size":4,
             "_source": ["imageid"]
           }
         },
         "max_score" : {          
                  "max": {            
                    "script": "_score"          
                  }        
                }
       }    
    }
  }

}

GET products/_analyze
{
  "analyzer": "name_edge_analyzer",
  "text": ["tree mango apple"]
}


GET products/_analyze
{
  "tokenizer": "standard",
  "text": ["my name is 45 bhuoendra"]
}


GET products/_analyze
{
  "tokenizer": "ngram",
  "text": ["my name is bhuoendra"]
}

GET products/_search?size=10&from=10

GET products/_mapping

GET products/_settings

POST products/_close

DELETE products/
#autocomletion//
POST products/_search?pretty
{ 
    "_source": "name",
    "suggest": {
        "doc-suggest" : {
            "prefix" : "mngo",
            "completion" : {
                "field" : "suggest",
                "fuzzy" : {
                    "fuzziness" : 2
                }
            }
        }
    }
}

GET products/_search
{
  "query": {
    "fuzzy" : {
            "name" : {
                    "value" :   "botl",
                    "fuzziness" :     2,
                    "prefix_length" : 2,
                    "max_expansions": 50
                    }
              }
          }
}          

GET products/_search
{
  "query": {
    "match": {
      "name": "ndnd"
    }
  },
    "_source": "name",
    "suggest": {
        "doc-suggest" : {
            "prefix" : "ndnd",
            "completion" : {
                "field" : "suggest",
                "fuzzy" : {
                    "fuzziness" : 2
                }
            }
        }
    }      
          
}


#search for distic category
GET /_search/
{
    
    "query": {
        "match" : {
            "name" : {
                "query" : "bzbz"
            }
        }
    },
    "size":0,
    "aggs":{
    "shops" : {
      "terms":{
        "script":"doc.category.size()==3?doc.category[2]+doc.category[1]+doc.category[0]:doc.category[1]+doc.category[0]",
        "order": { "max_score": "desc" }    
         },
       "aggs":{
         "shops_docs":{
           "top_hits":{
             "size": 1
           }
         },
         
         
         "max_score" : {          
                  "max": {            
                    "script": "_score"          
                  }        
                }
       }    
    }
  }
 

}


GET products/Boutique/_search

GET products/

DELETE products/

PUT products/
{   

  "settings": {
    "analysis": {
        "filter": {
            "custom_ngram": {
                "type": "nGram",
                "min_gram": 2,
                "max_gram": 4
            },
            "custom_edge_ngram":{
                "type": "edgeNGram",
                "min_gram": 2,
                "max_gram": 4    
            }
        },
        "analyzer": {
            "name_analyzer": {
                "type": "custom",
                "tokenizer": "standard",
                "filter": ["custom_ngram","lowercase"]
            },
            "name_edge_analyzer": {
                "type": "custom",
                "tokenizer": "standard",
                "filter": ["custom_edge_ngram","lowercase"]
            }           
        }
    }
  },
  "mappings": {
    "Footwear": {
    "properties": {
                "name": {"type": "text",
                  "analyzer": "name_analyzer",
                    "search_analyzer": "name_analyzer"
                },
                
                      "seller_uid": {
                        "type": "keyword"
                      },
                "suggest": {
                    "type": "completion",
                    "analyzer": "standard",
                    "search_analyzer": "standard"
                        }        
            }
    }
  }  
}