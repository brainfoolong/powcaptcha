const http = require('http')
const fs = require('fs')

const hostname = '0.0.0.0'
const port = 6597

const server = http.createServer((req, res) => {
  res.statusCode = 200
  if (req.url.endsWith('favicon.ico')) {
    res.end()
  } else if (req.url.endsWith('.html')) {
    res.setHeader('Content-Type', 'text/html')
    res.end(fs.readFileSync(__dirname + '/../' + req.url))
  } else if (req.url.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript')
    res.end(fs.readFileSync(__dirname + '/../' + req.url))
  } else {
    res.statusCode = 404
    res.end()
  }
})

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`)
})