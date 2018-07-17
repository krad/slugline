const test = require('tape')
import { Fetcher } from '../src/fetcher'
import {setupServer, tearDownServer, serverPort} from './fixture-server'

test.only('fetcher behavior', t=> {
  t.test(setupServer,     'setup the fixture server')
  t.test(fetchingAFile,   'should fetch a file')
  t.test(timeoutTest,     'test fetcher timeout behavior')
  t.test(tearDownServer,  'tore down the fixture server')
  t.end()
})

const fetchingAFile = (t) => {
  t.plan(2)

  const url = 'http://localhost:'+serverPort+'/basic/vod.m3u8'
  const fetcher = new Fetcher({url: url})

  fetcher.fetch().then(res => {
    t.ok(res)
    t.equals('MediaPlaylist', res.constructor.name, 'got a MediaPlaylist')
  }).catch(err => {
    t.fail('Should not have failed', err)
  })
}

const timeoutTest = (t) => {
  t.plan(4)
  t.timeoutAfter(3000)

  const fetcher = new Fetcher({url: '/delay?max=5000', timeout: 100})
  t.equals(0, fetcher.progress,     'progress was zero')
  t.equals(100, fetcher._timeout,   'default timeout was 100ms')
  t.equals('/delay?max=5000', fetcher._url,   'got correct url')

  fetcher.fetch()
  .then(res => { t.fail('We should have timeedOut') })
  .catch(err => {
    t.deepEquals(err, new Error('fetch timed out'), 'got timeout error')
  })
}
