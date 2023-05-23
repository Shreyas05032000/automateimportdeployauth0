const dotenv = require('dotenv').config() 
const { error } = require('console')
const fs =require('fs')
const path= require('path')
const axios = require('axios');
const qs = require('qs');
const { decode } = require('punycode')
//var base64 = require('base-64');

let role_id;
let role_secret;
let git_file_path;
let git_token;
let key_values;
let key;
let git_jsonData;
let nested_jsonData;
let decodedString;
let hashi_data;
role_id= process.env.ROLE_HASHI_ID;
console.log("role_id"+ role_id)
role_secret= process.env.ROLE_HASHI_SECRET;
console.log("role_secret"+ role_secret)
try {
let aud;
aud= process.env.PROD_TENANT_AUDIENCE
console.log("git_path"+ aud)

git_file_path= process.env.FILE_PATH
console.log("git_path"+ git_file_path)

git_token= process.env.FILE_TOKEN
console.log("git_token"+git_token)
try {
  console.log("start the process")
  let config = {
  method: 'get',
  maxBodyLength: Infinity,
  url: `https://api.github.com/repos/${git_file_path}`,
  headers: { 
    'Accept': 'application/json', 
    'X-GitHub-Api-Version': '2022-11-28', 
    'Authorization': `Bearer ${git_token}`
  }
};

axios.request(config)
.then((response) => {
  console.log(JSON.stringify(response.data));
  console.log(JSON.stringify(response.data.content)) // the data of the github file, which is in the content encrypted and we need to decrypt it. 
  
  // Create a buffer from the string
let bufferObj = Buffer.from(response.data.content, "base64");
// Encode the Buffer as a utf8 string
let decodedString = bufferObj.toString("utf8");
console.log("The decoded string:", decodedString.toLowerCase());
// console.log("decode string json parse"+ JSON.stringify(decodedString))
let jsonData = JSON.parse(decodedString.toLowerCase());// the json object data. 
// console.log("jsonData----------------------------"+jsonData)
// writing a loop to recobe
let keys = Object.keys(jsonData);
console.log("keys-------------------------------------"+ keys)
    // Loop through jsonData properties
    for (let i in jsonData) {
       git_jsonData = jsonData[i];
      console.log(`git_jsonData${i}:`, git_jsonData);
      
      if (typeof jsonData[i] === "object") {
        for (let nestedKey in jsonData[i]) {
          nested_jsonData= jsonData[i][nestedKey];
          console.log(`Nested Variable inside the GitHub file ${nestedKey}:`,  nested_jsonData);
        }
      } else if (jsonData[i] === null) {
        console.log(`No JSON objects found in the GitHub file.`);
      }
    }

    // get the access token or the client token or admin token. 
    let data = qs.stringify({
      'role_id': `${role_id}`,
      'secret_id': `${role_secret}` 
    });
    
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://vault-cluster-public-vault-d5217c59.3c55002a.z1.hashicorp.cloud:8200/v1/auth/approle/login',
      headers: { 
        'X-Vault-Namespace': 'admin', 
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data : data
    };
    axios.request(config)
    .then((response) => {
      console.log("JSON.stringify(response.data)JSON.stringify(response.data)"+JSON.stringify(response.data));// response data for the hashicorp gives the token for the vault engine creation
      console.log("admin token/ access token for hashi corp"+response.data.auth.client_token)// the admin token /the access token for the vault 
      admin_Token= response.data.auth.client_token;


      let config = {  
        method: 'get',
        maxBodyLength: Infinity,
        url: 'https://vault-cluster-public-vault-d5217c59.3c55002a.z1.hashicorp.cloud:8200/v1/secret/data/sample-secret',
        headers: { 
          'X-Vault-Token': `${admin_Token}`, 
          'X-Vault-Namespace': 'admin'
        }
      };
      
      axios.request(config)
      .then((response) => {
        // console.log("JSON.stringify(response.data)JSON.stringify(response.data)"+JSON.stringify(response.data));
      //   console.log("response.data.data.dataresponse.data.data.data"+ JSON.stringify(response.data.data.data)) // to get the values don't use JSON stringify , use the attributes with "." notation
         key_values = response.data.data.data;
         hashi_data= JSON.stringify(key_values)
         let keys_val = Object.keys(key_values);// take the keys of the objects.
         console.log("keys_val-------------------------------------"+ keys_val)
        //  console.log("hashi_data-------"+ hashi_data)
         for(let i in key_values){
         let  hashivalues= key_values[i]
          console.log (`key values from the hashicorp be${i}----`+ JSON.stringify(hashivalues))
               for (let i in hashivalues){
          console.log("first for loop hashidata")
          if (keys_val[i]===keys[i]){
            console.log("first if loop hashidata")
            for (let i in key_values) {
              console.log("second for loop hashidata")
                if (jsonData[i] !== key_values[i]) {
                  jsonData[i] = key_values[i];
                  console.log(`Updated value for key ${i}:`, jsonData[i]);
                }
                else{
                  console.log("the values are not available and error")
                }
              }
          }
         }
         }
    
       
        //  for (let i in keys_val)
        //  {
        //   if(){
            
        //   }
        //  }
        //  

        // for  (let i=0; i< hashi_data.length;i++)
        //  {
        //   console.log("forloop ")
        //   if (jsonData[i]!==key_values[i]){
        //     jsonData[i]= key_values[i]
        //     console.log(`Updated value for key ${i}:`, jsonData[i])
        //     console.log(`1111111${i}`+ jsonData[i])
        //     console.log(`22222 ${i}`+ key_values[i])

        //   }
        //  }
        
      })
      .catch((error) => {
        console.log(error);
      });
    })
    .catch((error) => {
      console.log(error);
    });

})
.catch((error) => {
  console.log(error);
});

} catch (error) {
    console.log(error)
    
}
 
  

    
   
// retrieving the secret form the valut. 
}
catch(error){
  console.log(error);
}
// uploading the file to the github


// var content = base64.encode(file);
// console.log(content);
// uploadFileApi(token, content)


        // fetch the file from prodtenant config file and replace/mapp the values to it. 
         // const data = fs.readFileSync("eyplaygroundconfig.json","utf-8") 
          // Converting to JSON 
      //  { grants = JSON.parse(data);
      //     console.log( grants)
      //     grants.AUTH0_KEYWORD_REPLACE_MAPPINGS.AUDIENCE=  key_values.audience
      //     grants.AUTH0_DOMAIN=  key_values.domain 
      //     grants.AUTH0_CLIENT_ID= key_values.client_id
      //     grants.AUTH0_CLIENT_SECRET=  key_values.client_secret
      
      //     // updating the file with extracted values. 
      //     const update_grant= fs.writeFileSync('eyplaygroundconfig.json', JSON.stringify(grants));
      //     console.log('JSON data has been updated.' +JSON.stringify(grants));}
         // let keys = Object.values(jsonData);
         // for (let i = 0; i < keys.length; i++) {
//   let key = keys[i];
//   console.log("keykey"+key)


// }
  // if (i === 0) {
  //   console.log(key); // we will use this logic for mapping with the secrets. 
  // }