const http    = require('http')
const express = require('express')
const path    = require('path')

/// Pick a random non-privleged port to listen on
const serverPort = Math.floor(Math.random() * 65535-1) + 1025
const app        = express()
app.use(express.static(path.join(__dirname, './fixtures')))
const server = http.createServer(app)

const setupServer = (t) => {
  t.plan(1)
  server.listen(serverPort, () => {
    t.ok(1, 'Server started listening on ' + serverPort)
  })
}

const tearDownServer = (t) => {
  t.plan(1)
  server.close(() => t.ok(1, 'Server closed on ' + serverPort))
}

export {setupServer, tearDownServer, serverPort}
