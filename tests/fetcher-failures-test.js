const test = require('tape')
import {server, setupServer, tearDownServer, hostAndPort} from './fail-server'
import { Fetcher } from '../src/fetcher'

test.only('fetcher failure scenarios', t=> {
  t.test(setupServer,         'setup the fail server')
  t.test(testFailServerFails, 'ensure the fail server fails')
  t.test(testRetry,           'ensure we retry when a request bombs out')
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
      t.fail('We should not have failed this time')
    })
  })
}

const testRetry = (t) => {

  t.end()
}
