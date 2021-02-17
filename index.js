/**
 * 
 *  MY MAIN API FILE
 */

// Dependencies
const { read } = require('fs')
const fs = require('fs')
const http = require('http')
const https = require('https')
const querystring = require('querystring')
const { StringDecoder } = require('string_decoder')

var handlers = require('./lib/handlers')

const config = require('./lib/config')
const _data = require('./lib/data')
const helpers = require('./lib/helpers')

const hostname = 'localhost'

// HTTP Server
var httpServer = http.createServer( (req, res) => unifiedServer(req, res) )

httpServer.listen(config.httpPort, hostname, function () {
    //Callback when done listening
    console.log("Server is listening on port " + config.httpPort + " in the " + config.envName + " environment.")
})

// HTTPS Server
var httpsOptions = {
    'cert': fs.readFileSync('./https/cert.crt'),
    'key': fs.readFileSync('./https/key.pem')
}
var httpsServer = https.createServer(httpsOptions, (req, res) => unifiedServer(req, res) )

httpsServer.listen(config.httpsPort, hostname, function () {
    //Callback when done listening
    console.log("Server is listening on port " + config.httpsPort + " in the " + config.envName + " environment.")
})

// Server Logic
function unifiedServer(req, res){
    
    //Parse the request's url`
    console.log(`http://${req.headers.host}`)
    var url = new URL(req.url, `http://${req.headers.host}`)

    //Get the path of the request
    var path = url.pathname.replace(/^\/+|\/+$/g, '') //trim ending '/'
    
    //get the query parameters sent as an object
    var queryParams = querystring.parse(url.search.slice(1)) //slices the "?" at the beginning of the string

    //get the method
    var method = req.method.toLowerCase()

    //Get the headers as an object
    var headers = req.headers

    // Parse the payload if applicable
    var decoder = new StringDecoder('utf-8') //to read the stream from the request's body as a string
    var buffer = '' //to store the data chunks as they arrive from the stream
    req.on( 'data', (chunk) => buffer += decoder.write(chunk))
    req.on( 'end', () => {
        buffer += decoder.end()

        // Get the handler corresponding to the path sent in the request, notFound if it doesn't exist
        var chosenHandler = typeof(router[path]) !== 'undefined' ? router[path] : handlers.notFound

        // Build the data object to send to the handler
        var data = {'path': path, 'queryParams': queryParams, 'method': method, 'headers': headers, 'payload': helpers.parseToJson(buffer)}

        // Route the request to the handler
        chosenHandler(data, (statusCode, payload) => {
            // Use status code sent or use 200 as default
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200
            // Use payload, or default it to {}
            payload = typeof(payload) == 'object' ? payload : {}

            // Convert the payload to a string (because can't send objects in response)
            var payloadString = JSON.stringify(payload)
            // Return the response
            res.setHeader('Content-Type','application/json')
            //res.writeHead(statusCode)
            res.statusCode = statusCode
            res.end(payloadString)

            console.log("Returning the response: ", statusCode, payloadString)
        })
    })
};

// Defining the request router
var router = {
    'ping': handlers.ping,
    'users' : handlers.users,
    'tokens' : handlers.tokens,
    'checks' : handlers.checks
};