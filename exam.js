
const axios = require('axios');
const qs = require('qs');
const fs =require('fs')

let role_id;
let role_secret;
let git_file_path;
let git_token;
let jsonData;
let key_values;
let git_sha;
const data = fs.readFileSync("./secrets.json","utf-8") 
const jsonfileData = JSON.parse(data);
role_id = jsonfileData.ROLE_HASHI_ID;
console.log("role_id:", role_id);
role_secret = jsonfileData.ROLE_HASHI_SECRET;
console.log("role_secret:", role_secret);


try {
    // Read users.json file
 
  git_file_path = jsonfileData.FILE_PATH;
  console.log("module printedfrom json data ",git_file_path)
  let aud;
  aud = jsonfileData.PROD_TENANT_AUDIENCE;
  console.log("aud:", aud);
  git_file_path = jsonfileData.FILE_PATH;
  console.log("git_file_path:", git_file_path);
  git_token = jsonfileData.FILE_TOKEN;
  console.log("git_token:", git_token);
  }
  catch(error){
  console.log('unable to read the file', error)
  }
try {
    console.log("start the git api")
    // Get content from GitHub
    let githubConfig = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `https://api.github.com/repos/${git_file_path}`,
        headers: {
            'Accept': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Authorization': `Bearer ${git_token}`
        }
    };
    axios.request(githubConfig)
        .then((response) => {
            console.log(JSON.stringify(response.data));
            console.log("GitHub content:", response.data.content);
            git_sha = response.data.sha // initialize sha response to the variable. 
            console.log("GitHub sha of the file", response.data.sha);
            // Decode GitHub content
            let bufferObj = Buffer.from(response.data.content, "base64");
            let decodedString = bufferObj.toString("utf8");
            //   console.log("Decoded string:", decodedString.toLowerCase());
            // Parse the decoded string as JSON
            jsonData = JSON.parse(decodedString.toLowerCase());
            console.log("jsonData:", jsonData);
            let keyword_replacement = jsonData.auth0_keyword_replace_mappings
            // Get access token from Hashicorp
            let data = qs.stringify({
                'role_id': role_id,
                'secret_id': role_secret
            });
            let vaultConfig = {
                method: 'post',
                maxBodyLength: Infinity,
                url: 'https://vault-cluster-public-vault-d5217c59.3c55002a.z1.hashicorp.cloud:8200/v1/auth/approle/login',
                headers: {
                    'X-Vault-Namespace': 'admin',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: data
            };
            axios.request(vaultConfig)
                .then((response) => {
                    console.log("Vault access token:", response.data.auth.client_token);
                    let admin_Token = response.data.auth.client_token;
                    // Get secret data from Hashicorp
                    let secretConfig = {
                        method: 'get',
                        maxBodyLength: Infinity,
                        url: 'https://vault-cluster-public-vault-d5217c59.3c55002a.z1.hashicorp.cloud:8200/v1/secret/data/sample-secret',
                        headers: {
                            'X-Vault-Token': admin_Token,
                            'X-Vault-Namespace': 'admin'
                        }
                    };
                    axios.request(secretConfig)
                        .then(async (response) => {
                            key_values = response.data.data.data;
                            console.log("key_values:", key_values);
                            // Map and update values based on matching keys
                            for (let key in jsonData) {
                                if (key_values.hasOwnProperty(key) && jsonData[key] !== key_values[key]) {
                                    jsonData[key] = key_values[key];
                                    console.log(`Updated value for key "${key}":`, jsonData[key]);
                                }
                                if (key === 'auth0_keyword_replace_mappings' && typeof jsonData[key] === 'object') {
                                    let nestedMappings = jsonData[key];

                                    for (let nestedKey in nestedMappings) {
                                        if (key_values.hasOwnProperty(nestedKey) && nestedMappings[nestedKey] !== key_values[nestedKey]) {
                                            nestedMappings[nestedKey] = key_values[nestedKey];
                                            console.log(`Updated value for nested key "${nestedKey}":`, nestedMappings[nestedKey]);
                                        }
                                    }
                                }
                            }
                            let final_data = jsonData
                            console.log("final_data---------------------", JSON.stringify(final_data))
                            // Capitalize keys in jsonData
                            function allKeysToUpperCase(obj) {
                                var output = {};
                                for (i in obj) {
                                    if (Object.prototype.toString.apply(obj[i]) === '[object Object]') {
                                        output[i.toUpperCase()] = allKeysToUpperCase(obj[i]);
                                    } else {
                                        output[i.toUpperCase()] = obj[i];
                                    }
                                }
                                return output;
                            }
                            var capitalized_data = allKeysToUpperCase(final_data);
                            console.log("output", capitalized_data)
                            // base64 encode 
                            function jsonToBase64(object) {
                                const json = JSON.stringify(object);
                                return Buffer.from(json).toString("base64");
                            }
                            jsonToBase64(capitalized_data)
                            console.log("base data----------------" + jsonToBase64(capitalized_data))
                            let content = jsonToBase64(capitalized_data)
                            if (git_sha === undefined || git_sha === null) {
                                console.log("sha is not defined, hence creating a new rep file ");
                                // let data = JSON.stringify({
                                //     "message": "upload from api",
                                //     "content": `${content}`
                                // });

                                // let config = {
                                //     method: 'put',
                                //     maxBodyLength: Infinity,
                                //     url: `https://api.github.com/repos/${git_file_path}`,
                                //     headers: {
                                //         'Accept': 'application/vnd.github+json',
                                //         'Authorization': `Bearer ${git_token} `,
                                //         'X-GitHub-Api-Version': '2022-11-28',
                                //         'Content-Type': 'application/vnd.github+json'
                                //     },
                                //     data: data
                                // };

                                // axios.request(config)
                                //     .then((response) => {
                                //         console.log(JSON.stringify(response.data));
                                //         console.log("File has ben created....")
                                //     })
                                //     .catch((error) => {
                                //         console.log(error);
                                //     });
                            } else {
                                // uplaod the file 
                                let data = JSON.stringify({
                                    "message": "upload from api",
                                    "content": `${content}`,
                                    "sha": `${git_sha}`
                                });
                                let config = {
                                    method: 'put',
                                    maxBodyLength: Infinity,
                                    url: `https://api.github.com/repos/${git_file_path}`,
                                    headers: {
                                        'Accept': 'application/vnd.github+json',
                                        'Authorization': `Bearer ${git_token}`,
                                        'X-GitHub-Api-Version': '2022-11-28',
                                        'Content-Type': 'application/x-www-form-urlencoded'
                                    },
                                    data: data
                                };
                                axios.request(config)
                                    .then((response) => {
                                        console.log(JSON.stringify(response.data));
                                        console.log("File data has been uploaded.")
                                    })
                                    .catch((error) => {
                                        console.log(error);
                                    });
                            }
                        })
                        .catch((error) => {
                            console.log("Error retrieving secret data from Hashicorp:", error);
                        });
                })
                .catch((error) => {
                    console.log("Error retrieving Vault access token:", error);
                });
        })
        .catch((error) => {
            console.log("Error retrieving GitHub content:", error);
        });
}
catch (error) {
    console.log("Error:", error);
}
