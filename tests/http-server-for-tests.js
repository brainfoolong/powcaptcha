const http = require('http')
const fs = require('fs')

const hostname = '0.0.0.0'
const port = 6597

const server = http.createServer((req, res) => {
  res.statusCode = 200
  const file = __dirname + '/../' + req.url
  const fileExists = fs.existsSync(file)
  if (req.url.endsWith('favicon.ico')) {
    res.end()
  }
  if (fileExists) {
    if (req.url.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html')
      res.end(fs.readFileSync(file))
      return
    } else if (req.url.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript')
      res.end(fs.readFileSync(file))
      return
    } else if (req.url.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json')
      res.end(fs.readFileSync(file))
      return
    }
  }
  res.statusCode = 404
  res.end()
})

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`)
})