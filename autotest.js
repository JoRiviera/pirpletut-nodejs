const http = require('http')
const url = require('url')
const querystring = require('querystring')
var { StringDecoder } = require('string_decoder')

var hostname = 'localhost'
var port = 3000

var server = http.createServer((req, res) => {
    // Get the url path
        var url = new URL(req.url, `http://${req.headers.host}`)
        var path = url.pathname.replace(/^\/+|\/+$/g, '')
    // Get the queries
        var query = querystring.parse(url.search.slice(1))
    // Get the headers
        var headers = req.headers
    // Method
        var method = req.method.toLowerCase()
    // Get the payloads
        var buffer = ""
        var decoder = new StringDecoder('utf-8')
        req.on('data', (chunk) => {
            buffer += decoder.write(chunk)
        })
        req.on('end', () => {
            buffer += decoder.end()
            // Send the response
            console.log(`Request: ${method} on ${path} with`, query)
            console.log('Headers: ', headers)
            console.log('Payloads Received: ', buffer)
            res.end("Dinner is served")
        })
    })

server.listen(port, hostname, () => {
    console.log(`Server is listening on port ${port} at host ${hostname}.`)
})