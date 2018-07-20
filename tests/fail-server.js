const http    = require('http')
const express = require('express')
const path    = require('path')
const fs      = require('fs')

/// Pick a random non-privleged port to listen on
const serverPort = Math.floor(Math.random() * 65535-1026) + 1025
const app        = express()

const server = {
  _server: http.createServer(app),
  failCount: 0
}

app.get('/fail-decr', (req, res) => {
  if (server.failCount > 0) {
    const responseCode = server.failCode || 500
    res.status(responseCode)
    res.end()
    server.failCount -= 1
    delete server.failCode
  } else {
    res.status(200)
    // If we have a fixture stream it
    if (server.fixture) { fs.createReadStream(server.fixture).pipe(res) }
    else { res.end() }
  }
})

app.get('/redirect', (req, res) => {
  res.redirect(301, '/fail-decr')
  res.end()
})

const setupServer = (t) => {
  t.plan(1)
  server._server.listen(serverPort, () => {
    t.ok(1, 'Server started listening on ' + serverPort)
  })
}

const tearDownServer = (t) => {
  t.plan(1)
  t.timeoutAfter(2000)
  server._server.close(() => {
    t.ok(1, 'Server closed on ' + serverPort)
    t.end()
  })
}

const hostAndPort = () => { return 'http://localhost:'+serverPort }


export {server, setupServer, tearDownServer, serverPort, hostAndPort}
