/*
* HELPERS FOR VARIOUS TASKS
*/

// Depencies
const crypto = require('crypto');
const config = require('./config');

var helpers = {};

// Create a SHA256 hash
helpers.hash = function(string){
    if(!(typeof(string) == "string" && string.length > 0)){
        return false;
    } else {
        var hash = crypto.createHmac('sha256', config.hashKey).update(string).digest('hex');
        return hash;
    }
};

// Parse a string to JSON without throwing error
helpers.parseToJson = function(string){
    try{ 
        var obj = JSON.parse(string);
        return obj;
    } catch(err){ return {};}
};

// Random string of alphanumeric characters of specified length
helpers.randomString = function(length){
    // Check Length
    length = typeof(length) == "number" && length > 0 ? length : false;
    if(!length){ return false;}
    else {
        // Set an array of eligible character ranges(charcodes)
        var possibleCharsRanges = [[48,58],[65,91],[97,123]];
        // Create the collection to pick from
        var charPicks = [];
        for(var range of possibleCharsRanges){
            for(var i = range[0]; i < range[1]; i++){
                charPicks.push(i)
            }
        }
        // Create random string
        var randomString = "";
        for(var n = 0; n < length; n++){
            randomString +=  String.fromCharCode(charPicks[Math.floor(Math.random()*charPicks.length)]);
        }
        return randomString
    }
};

helpers.randomString(20);

module.exports = helpers;