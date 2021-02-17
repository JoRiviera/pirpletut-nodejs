/****
 * 
 * Data Storage and Editing Library
 * 
*/

// Dependencies
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers')


// Library 
var lib = {};

// Data Folder Path
lib.dataDir = path.join(__dirname, '/../.data/')

// Write data in a new file in the database in /data/dir, callback is an error handler
lib.create = function(dir, file, data, callback){
    fs.open(lib.dataDir+dir+'/'+file+'.json','wx', function(err, fileDescriptor){
        if(!err && fileDescriptor){
            // Convert the json object into a string
            var stringData = JSON.stringify(data);

            // Write to file
            fs.writeFile(fileDescriptor, stringData, (err) => {
                if(!err) { fs.close(fileDescriptor, (err) => {
                    if(!err){callback(false);} 
                    else { callback('Error closing the file.');}
                });
                }
                else { callback('Error writing to file.');}
            });
        } else {
            callback('Could not create, file may already exist.');
        }
    });
};

// Read Data from a file, returns data as object
lib.read = function(dir, file, callback){
    fs.readFile(lib.dataDir + dir + '/' + file + '.json', 'utf-8', (err, data) => {
        if(err || !data){callback(err,data);
        } else { 
            var parsedData = helpers.parseToJson(data);
            callback(false, parsedData);
        }
    });
};

// Update data from an existing file
lib.update = function(dir, file, data, callback){
    // open the file
    fs.open(lib.dataDir+dir+'/'+file+'.json','r+', (err, fileDescriptor) => {
        if(err) { callback("Error Opening the file " + file); }
        else{
            // Convert Data in string
            var stringData = JSON.stringify(data);

            // Truncate the file
            fs.ftruncate(fileDescriptor, (err) => {
                if(err){ callback('Error truncating the file') ;}
                else{
                    // Write to the file and close it
                    fs.writeFile(fileDescriptor, stringData, (err) => {
                        if(err) { callback("Error writing to existing file." + file); }
                        else{ fs.close(fileDescriptor, (err) => { 
                                if(err) callback("Error closing existing file" + file);
                                else callback(false)
                            });
                        }
                    });
                }
            });
        }
    });
};

// Delete a File
lib.delete = function(dir,file, callback){
    // Unlink the file
    fs.unlink(lib.dataDir + dir + '/' + file + '.json', (err) =>{
        if(err) callback("Error deleting the file " + file)
        else callback(false)
    });
}

// Export the library
module.exports = lib;