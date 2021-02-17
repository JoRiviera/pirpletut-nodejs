/**
 * Request Handlers
*/

// Dependencie
const config = require('./config');
const _data = require('./data');
const helpers = require('./helpers');

// Define the handlers
var handlers = {};

/***************
 * Users
 */

handlers.users = function(data, callback){
    var acceptMethods = ['post', 'get', 'put', 'delete'];
    if(!acceptMethods.includes(data.method)) callback(405) //Method not allowed
    else handlers._users[data.method](data, callback)
};

// Users submethods (PRIVATE)
handlers._users = {};

// USERS - POST
// Required data : firstName, lastName, phone, password, tosAgreement
// Optionnal : none
handlers._users.post = function(data, callback){
    // Check all required field are filled out
    var firstName = typeof(data.payload.firstName) == "string" && data.payload.firstName.trim() !== "" ?
        data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == "string" && data.payload.lastName.trim() !== "" ? 
        data.payload.lastName.trim() : false;
    var phone = typeof(data.payload.phone) == "string" && data.payload.phone.trim().length === 10 ?
        data.payload.phone.trim() : false;
    var password = typeof(data.payload.password) == "string" && data.payload.password.trim() !== "" ?
        data.payload.password.trim() : false;
    var tosAgreement = typeof(data.payload.tosAgreement) == "boolean" && data.payload.tosAgreement === true ? true : false;

    if(!(firstName && lastName && phone && password && tosAgreement)){
        callback(400, {'Error':'Missing required fields'}) // 400: Bad Request
    } else {
        // Check if user already exists by phone number
        _data.read('users', phone, (err, data) => {
            if(!err){
                callback(400, {'Error': 'User already exists with this phone number.'});
            } else {
                // ------Create user object
                // Hash the password
                var hashedPW = helpers.hash(password);
                if(hashedPW){
                    var userObj = {
                        'firstName' : firstName, 'lastName' : lastName,
                        'password' : hashedPW, 'tosAgreement' : true,
                        'phone' : phone
                    };
                    _data.create('users', phone, userObj, (err) => {
                        if(err){ 
                            console.log(err);
                            callback(500, {'Error': "Could not create user."});
                        }
                        else { callback(200)}
                    });
                } else {
                    callback(500, {'Error' : 'Could not hash password.'})
                }
            }
        });
    }
}

// USERS - GET
// Required data: phone
// Optionnal: none
handlers._users.get = function(data, callback){
    // Check if phone number is valid
    var phone = typeof(data.queryParams.phone) == "string" && data.queryParams.phone.trim().length == 10 ? data.queryParams.phone.trim() : "";
    if(!phone){ callback(400, {"Error":"Missing required field."})
    } else {
        // Get the token from the headers
        var token = typeof(data.headers.token) == "string" ? data.headers.token : false;
        // Verify if the token if valid
        handlers._tokens.verifyToken(token, phone, (isValid) => {
            if(!isValid){callback(403,{"Error":"Missing token in headers or token invalid"})}
            else{
                // Look up the user
                _data.read('users', phone, (err, data) => {
                    if(err || !data){
                        console.log(err);
                        callback(404);
                    } else {
                        // Remove password from the data to send
                        delete data.password;
                        callback(200, data);
                    }
                });
            }
        });
    }
};

// USERS - PUT
// Required : phone
// Optionnal: firstName, lastName, password (min 1 specified)
handlers._users.put = function(data, callback){
    // Check required params
    var phone = typeof(data.payload.phone) == "string" && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : "";
    // Optionnal Params
    var firstName = typeof(data.payload.firstName) == "string" && data.payload.firstName.trim() !== "" ?
        data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == "string" && data.payload.lastName.trim() !== "" ? 
        data.payload.lastName.trim() : false;
    var password = typeof(data.payload.password) == "string" && data.payload.password.trim() !== "" ?
        data.payload.password.trim() : false;
    
    if(!(phone && (firstName || lastName || password))){
        callback(400, {"Error":"Missing required field and/or no field to update."})
    } else {

        // Get the token from the headers
        var token = typeof(data.headers.token) == "string" ? data.headers.token : false;
        // Verify if the token if valid
        handlers._tokens.verifyToken(token, phone, (isValid) => {
            if(!isValid){callback(403,{"Error":"Missing token in headers or token invalid"})}
            else{
                // Get the current user Object _data.read
                _data.read('users', phone, (err, userData) => {
                    if(err || !userData){
                        callback(400, {"Error:":"The user does not exist."});
                    } else {
                        if(firstName) { userData.firstName = firstName;}
                        if(lastName) { userData.lastName = lastName;}
                        if(password) { userData.password = helpers.hash(password)}
                        _data.update('users', phone, userData, (err) => {
                            if(err){
                                callback(500, {"Error": "Could not update user."});
                            } else {
                                callback(200)
                            }
                        });
                    }
                })
            }
        });        
    }
};

// USERS - DELETE
// Required: Phone
handlers._users.delete = function(data, callback){
    // Validate Phone number
    var phone = typeof(data.queryParams.phone) == "string" && data.queryParams.phone.trim().length == 10 ? data.queryParams.phone.trim() : "";
    if(!phone){ callback(400, {"Error":"Missing required field."})
    } else {

        // Get the token from the headers
        var token = typeof(data.headers.token) == "string" ? data.headers.token : false;
        // Verify if the token if valid
        handlers._tokens.verifyToken(token, phone, (isValid) => {
            if(!isValid){callback(403,{"Error":"Missing token in headers or token invalid"})}
            else{
                // Look up the user
                _data.read('users', phone, (err, userData) => {
                    if(err || !data){
                    console.log(err);
                    callback(400, {"Error:":"Could not find the user."});
                    } else {
                        // Remove password from the data to send
                        _data.delete('users', phone, (err) => {
                        if(err) { callback(500, {"Error:":"Could not delete the user."})}
                        else { 
                            // Delete each of the checks from the user data
                            var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                            var checksToDelete = userChecks.length;
                            if(userChecks <= 0) { callback(200);
                            } else {
                                var checksDeleted = 0;
                                var deletionErrors = false;
                                userChecks.forEach( function(checkID){
                                    _data.delete('checks', checkID, function(err){
                                        if(err){ 
                                            deletionErrors = true;
                                        };
                                        checksDeleted++;
                                        if(checksDeleted == checksToDelete){
                                            if(deletionErrors){
                                                callback(500, {'Error' : 'Errors encountered while deleting the checks. All checks might not have been deleted.'});
                                            } else {
                                                callback(200);
                                            }
                                        };
                                    });
                                });
                            };
                        };
                    });
                }
            });
            }
        });
        
    }
};

/***************
 * Tokens
 */

handlers.tokens = function(data, callback){
    var acceptMethods = ['post', 'get', 'put', 'delete'];
    if(!acceptMethods.includes(data.method)) callback(405) //Method not allowed
    else handlers._tokens[data.method](data, callback)
};

// Tokens Submethods (PRIVATE)
handlers._tokens = {};

// TOKENS - POST
// Required: phone, password
// Optionnal Data: None
handlers._tokens.post = function(data, callback){
    var phone = typeof(data.payload.phone) == "string" && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : "";
    var password = typeof(data.payload.password) == "string" && data.payload.password.trim().length != 0 ? data.payload.password.trim() : "";

    if( !(phone && password) ){
        callback(400, {"Error":"Missing required fields."});
    } else {
        // Check the password from the user's file
        _data.read('users', phone, (err, data) => {
            if(err) {callback(404, {"Error":"User does not exist."})}
            else {
                var hashedPw = helpers.hash(password);
                if(hashedPw != data.password){ callback(400,{"Error":"Passwords don't match."})}
                else{
                    // Create new token
                    // Expiration 1h, random 20 length string name
                    var tokenId = helpers.randomString(20);
                    var expires = Date.now() + 1000*3600;
                    var token = {
                        "phone":phone, "id":tokenId, "expires":expires
                    }
                    // Store the token
                    _data.create('tokens', tokenId, token, (err) => {
                        if(err) {callback(500, {"Error":"Token creation failed."})}
                        else {callback(200, token)}
                    });
                }
            }
        });
    }
}

// TOKENS - GET
// Required: id
// Optionnal Data: None
handlers._tokens.get = function(data, callback){
    var id = typeof(data.queryParams.id) == "string" && data.queryParams.id.trim().length != 0 ? data.queryParams.id.trim() : false;
    if(!id){callback(400,{"Error":"Invalid ID."})}
    else {
        _data.read('tokens', id, (err, data) => {
            if(err){callback(404, {"Error":"Could not read the token."})}
            else{callback(200, data)}
        });
    }
};

// TOKENS - PUT
// Required: id, extend
// Optionnal Data: None
handlers._tokens.put = function(data, callback){
    var id = typeof(data.payload.id) == "string" && data.payload.id.trim().length > 0 ? data.payload.id.trim() : false;
    var extend = typeof(data.payload.extend) == "boolean" && data.payload.extend === true ? true : false;
    if(!(id && extend)){ callback(400, {"Error":"Invalid Fields."})}
    else{
        _data.read('tokens',id,(err,token) => {
            if(err || !token){ callback(404, {"Error": "Token not found."})}
            else{
                // If token is expired, user need to reauth
                if(token.expires < Date.now()){callback(400,{"Error":"Token already expired."})}
                else{ 
                    token.expires = Date.now() + 1000*3600;
                    //Store the update
                    _data.update('tokens', id, token, (err) =>{
                        if(err){callback(500, {"Error":"Couldn't update the token."})}
                        else{callback(200)}
                    })
                }
            }
        });
    }
}

// TOKENS - DELETE
// Required: id
// Optionnal Data: None
handlers._tokens.delete = function(data, callback){
    var id = typeof(data.queryParams.id) == "string" && data.queryParams.id.trim().length > 0 ? data.queryParams.id : false;
    if(!id){callback(400,{"Error":"Invalid Id."})}
    else{
        _data.delete('tokens',id, (err) => {
            if(err) {callback(404, {"Error":"Token Not Found."})}
            else{callback(200)}
        });
    }
}

// TOKEN - Check Authentification
// Required: id, phone
// Callback: true if match, false otherwise
handlers._tokens.verifyToken = function(id,phone,callback){
    // Check Token
    _data.read('tokens',id, (err, data) => {
        if(err || !data){
            callback(false);
        } else {
            callback(data.phone == phone && data.expires > Date.now() );
        }
    });
}


/***************
 * Checks
 */

handlers.checks = function(data, callback){
    var acceptMethods = ['post', 'get', 'put', 'delete'];
    if(!acceptMethods.includes(data.method)) callback(405) //Method not allowed
    else handlers._checks[data.method](data, callback)
};

// Container for checks
handlers._checks = {};

// Checks POST
// Required data : protocol, url, method, successCodes, timeoutSeconds
// Optional : none
handlers._checks.post = function(data, callback) {
    // Validate inputs
    var protocol = typeof(data.payload.protocol) == "string" && ['http','https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : "";
    var url = typeof(data.payload.url) == "string" && data.payload.url.trim().length >  0 ? data.payload.url.trim() : "";
    var method = typeof(data.payload.method) == "string" && ['post','get', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : "";
    var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;
    if( !protocol || !url || !method || !successCodes || !timeoutSeconds){
        callback(400, {'Error' : 'Inputs are invalid.'});
    } else {
        // Get the token from the headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        if(!token) { callback(400, {"Error" : "Invalid Token."})}
        else{
            // Lookup the user by reading the token
            _data.read('tokens', token, function(err, tokenData){
                if(err || !tokenData){ callback(403)} // Non authorized
                else{
                    var userPhone = tokenData.phone;
                    // Lookup user
                    _data.read('users', userPhone, function(err, userData){
                        if(err || !userData){
                            callback(403);
                        } else {
                            // Lookup the checks of the user
                            var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                            // Verify the checks limits
                            if( userChecks.length >= config.maxChecks ){
                                callback(400, {'Error' : 'User already has the maximum of checks (' + config.maxChecks +')'});
                            } else {
                                // create a random id for the check
                                var checkID = helpers.randomString(20);
                                // create the check object and include user's phone
                                var checkObject = {
                                    'id' : checkID,
                                    'userPhone' : userPhone,
                                    'url' : url,
                                    'method' : method,
                                    'successCodes' : successCodes,
                                    'timeoutSeconds' : timeoutSeconds
                                }
                                // Save the object
                                _data.create('checks', checkID, checkObject, function(err){
                                    if(err){
                                        callback(500, {'Error':'Could not create the user'})
                                    } else {
                                        // add the check id to the user object
                                        userData.checks = userChecks;
                                        userData.checks.push(checkID);

                                        // save the new user data
                                        _data.update('users', userPhone, userData, function(err){
                                            if(err) {callback(500, {'Error':'Could not update the user with the new check'})}
                                            else {
                                                callback(200, checkObject);
                                            }
                                        })
                                    }
                                })
                            }
                        };
                    })

                };
            })
        }
    }
};

// CHECK - GET
// Required Data: id
// Optional : none
handlers._checks.get = function(data, callback) {
    // Check the input
    var id = typeof(data.queryParams.id) == "string" && data.queryParams.id.trim().length == 20 ? data.queryParams.id.trim() : false ;
    if(!id){
        callback(400, {'Error' : 'Invalid ID.'});
    } else {
        // Look up the check
        _data.read('checks', id, function(err, checkData){
            if(err || ! checkData){
                callback(403);
            } else {
                // Get given token
                var token = typeof(data.headers.token) == "string" ? data.headers.token : false;
                // Verify token and that it belongs to the user who created the token
                handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid){
                    if(!tokenIsValid){
                        callback(403, {'Error' : 'Missing Token or token is invalid'});
                    } else {
                        // Return the check data
                        callback(200, checkData);
                    };
                });
            };
        });
    }
}

// CHECKS PUT
// Required data : id
// Optional data : protocol, url, method, successCodes, timeoutSeconds - one must be sent
handlers._checks.put = function (data, callback){
    // Check id
    var id = typeof(data.payload.id) == "string" && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false ;
    // Check optional inputs
    var protocol = typeof(data.payload.protocol) == "string" && ['http','https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : "";
    var url = typeof(data.payload.url) == "string" && data.payload.url.trim().length >  0 ? data.payload.url.trim() : "";
    var method = typeof(data.payload.method) == "string" && ['post','get', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : "";
    var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;
    if(!id){ callback(400, {'Error' : 'Missing or invalid id'});
    } else {
        // Check if at least one optional field has been sent
        if( !(protocol || url || method || successCodes) ){ callback(400, {'Error' : 'Missing a field to modify'})
        } else {
            // lookup the check
            _data.read('checks', id, function(err, checkData){
                if(err || !checkData){
                    callback(400, {'Error' : 'Check id did not exist'})
                } else {
                    // Verifiy that token is valid and belongs to the user
                    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                    handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid){
                        if(!tokenIsValid){
                            callback(403);
                        } else {
                            // Update the check where it's necessary
                            if(protocol){
                                checkData.protocol = protocol;
                            };
                            if(url){
                                checkData.url = url;
                            };
                            if(method){
                                checkData.method = method;
                            };
                            if(successCodes){
                                checkData.successCodes = successCodes;
                            };
                            if(timeoutSeconds){
                                checkData.timeoutSeconds = timeoutSeconds;
                            };

                            // Store the updates
                            _data.update('checks', id, checkData, function(err){
                                if(err){
                                    callback(500, {'Error' : 'Could not update the check'});
                                } else {
                                    callback(200);
                                };
                            });
                        }
                    });
                };
            });
        };
    };
};

// Checks - DELETE
// Required : id
// Optional none

handlers._checks.delete = function(data, callback){
    // Check input
    var id = typeof(data.queryParams.id) == "string" && data.queryParams.id.trim().length == 20 ? data.queryParams.id.trim() : false ;
    if(!id){ callback(400, {'Error' : 'Missing or invalid id'});
    } else {
        // Lookup the check
        _data.read('checks', id, function(err, checkData){
            if(err || !checkData){
                callback(400, {'Error' : 'Check id did not exist'})
            } else {
                // Check if it belongs to the user
                // Verifiy that token is valid and belongs to the user
                var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid){
                    if(!tokenIsValid){
                        callback(403);
                    } else {
                        // Delete the check data
                        _data.delete('checks', id, function(err){
                            if(err){ callback(500, {'Error' : 'Could not delete the check data'});
                            } else {
                                // Lookup user
                                _data.read('users', checkData.userPhone, function(err, userData){
                                    if(err || ! userData){ 
                                        callback(500, { 'Error' : 'Could not find the specified user. Check is not removed'})
                                    } else {
                                        var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                                        // Remove the deleted checks
                                        var checkIndex = userChecks.indexOf(id);
                                        if(checkIndex <= -1){ callback(500, {'Error' : 'Could not find the checks on the user data.'})
                                        } else {
                                            userChecks.splice(checkIndex, 1);
                                            _data.update('users', checkData.userPhone, userData, function(err){
                                                if(err) { callback(500, {'Error' : 'Could not update the user\'s checks'});
                                                } else { callback(200)
                                                };
                                            });
                                        };
                                    };
                                });
                            };
                        });
                    };
                });
            }
        });
    };

};

// Sample handler
handlers.ping = function(data, callback){ //data is everything we parsed from the request
    // Callback a status code and a payload object
    callback(200)
};
// Not Found handler
handlers.notFound = function(data, callback){
    callback(404)
};

// Export the handlers
module.exports = handlers;