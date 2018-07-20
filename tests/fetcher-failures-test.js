const test = require('tape')
import {server, setupServer, tearDownServer, hostAndPort} from './fail-server'
import { Fetcher } from '../src/fetcher'

test.only('fetcher failure scenarios', t=> {
  t.test(setupServer,         'setup the fail server')
  t.test(testFailServerFails, 'ensure the fail server fails')
  t.test(testRetryOn500,      'ensure we retry on error 500')
  t.test(tearDownServer,      'tore down the fail server')
  t.end()
})

const testFailServerFails = (t) => {
  t.plan(4)
  t.timeoutAfter(3000)

  server.failCount = 1
  server.failCode  = 500
  t.equals(1, server.failCount, 'server configured to fail 1 time')

  const url = hostAndPort()+'/fail-decr'
  const fetcher = new Fetcher({url: url})

  fetcher.fetch().then(res => {
    t.fail('Our call should not have succeeded')
  }).catch(err => {
    t.ok(1, 'we failed')
    t.equals(0, server.failCount, 'server fail count was set to 0')

    server.fixture  = './tests/fixtures/basic/vod.m3u8'
    const nextFetch = new Fetcher({url: url})
    nextFetch.fetch().then(res => {
      t.ok(res, 'we got a successful response')
    }).catch(err => {
      t.fail('We should not have failed this time ' + err)
    })
  })
}

const testRetryOn500 = (t) => {
  t.plan(1)
  t.timeoutAfter(3000)

  server.failCount  = 1
  server.failCode   = 500
  server.fixture    = './tests/fixtures/basic/vod.m3u8'

  const url = hostAndPort()+'/fail-decr'
  const fetcher = new Fetcher({url: url, retryCount: 2})

  fetcher.fetch().then(res => {
    t.ok(res, 'successfully retried until things were a success')
  }).catch(err => {
    t.fail('We should not have failed ' + err)
  })

}
