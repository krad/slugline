const test = require('tape')
import {server, setupServer, tearDownServer, hostAndPort} from './fail-server'
import { Fetcher } from '../src/fetcher'

test.only('fetcher failure scenarios', t=> {
  t.test(setupServer,                 'setup the fail server')
  t.test(testFailServerFails,         'ensure the fail server fails')
  t.test(testRetryOn500,              'ensure we retry on error 500')
  t.test(testRetryOn404,              'ensure we fail immediately on error 404')
  t.test(testExhaustingRetryAttempts, 'ensure we can exhaust retry attempts')
  t.test(testRetryon301,              'ensure we follow 301')
  t.test(tearDownServer,              'tore down the fail server')
  t.end()
})

const testFailServerFails = (t) => {
  t.plan(5)
  t.timeoutAfter(3000)

  server.failCount = 1
  server.failCode  = 500
  t.equals(1, server.failCount, 'server configured to fail 1 time')

  const url = hostAndPort()+'/fail-decr'
  const fetcher = new Fetcher({url: url, maxRetries: 0})

  fetcher.fetch().then(res => {
    t.fail('Our call should not have succeeded')
  }).catch(err => {
    t.ok(1, 'we failed')
    t.equals(1, fetcher.fetchCount, 'made correct amount of fetches')
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
  t.plan(2)
  t.timeoutAfter(3000)

  server.failCount  = 1
  server.failCode   = 500
  server.fixture    = './tests/fixtures/basic/vod.m3u8'

  const url     = hostAndPort()+'/fail-decr'
  const fetcher = new Fetcher({url: url, maxRetries: 2})

  fetcher.fetch().then(res => {
    t.ok(res, 'successfully retried until things were a success')
    t.equals(2, fetcher.fetchCount, 'made correct amount of fetches')
  }).catch(err => {
    t.fail('We should not have failed ' + err)
  })
}

const testRetryOn404 = (t) => {
  t.plan(2)
  t.timeoutAfter(3000)

  server.failCount  = 1
  server.failCode   = 404
  server.fixture    = './tests/fixtures/basic/vod.m3u8'

  const url = hostAndPort()+'/fail-decr'
  const fetcher = new Fetcher({url: url, maxRetries: 2})

  fetcher.fetch().then(res => {
    t.fail('we should not have succeeded')
  }).catch(err => {
    t.ok(err, 'we failed on 404')
    t.equals(1, fetcher.fetchCount, 'made correct amount of fetches')
  })
}

const testExhaustingRetryAttempts = (t) => {
  t.plan(2)
  t.timeoutAfter(3000)

  server.failCount  = 10
  server.failCode   = 500
  server.fixture    = './tests/fixtures/basic/vod.m3u8'

  const url     = hostAndPort()+'/fail-decr'
  const fetcher = new Fetcher({url: url, maxRetries: 2})

  fetcher.fetch().then(res => {
    t.fail('we should not have succeeded')
  }).catch(err => {
    t.ok(err, 'we failed on after x amount of retries')
    t.equals(3, fetcher.fetchCount, 'made correct amount of fetches')
  })
}

const testRetryon301 = (t) => {
  t.plan(5)
  t.timeoutAfter(3000)

  server.failCount  = 1
  server.failCode   = 500
  server.fixture    = './tests/fixtures/basic/vod.m3u8'

  const url     = hostAndPort()+'/redirect'
  const fetcher = new Fetcher({url: url, maxRetries: 2})

  fetcher.fetch().then(res => {
    t.ok(res)
    t.equal(3, fetcher.fetchCount,        'made correct amount of fetches')
    t.equals(url, fetcher.url,            'original url stayed intact')
    t.equals(1, fetcher.redirects.length, 'kept a path of urls redirected to')
    t.deepEqual([hostAndPort()+'/fail-decr'], fetcher.redirects, 'paths look legit')
  }).catch(err => {
    t.fail('we should not have failed')
  })
}
