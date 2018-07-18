const test = require('tape')
import { Fetcher, PlaylistFetcher } from '../src/fetcher'
import {setupServer, tearDownServer, serverPort, hostAndPort} from './fixture-server'

test('fetcher behavior', t=> {
  t.test(setupServer,             'fetcher behavior - setup the fixture server')
  t.test(fetchingPlaylistTest,    'should fetch a file')
  t.test(timeoutTest,             'test fetcher timeout behavior')
  t.test(tearDownServer,          'fetcher behavior - tore down the fixture server')
  t.end()
})

const fetchingPlaylistTest = (t) => {
  t.plan(4)
  t.timeoutAfter(3000)

  const url     = hostAndPort()+'/basic/krad.tv/tractor/vod.m3u8'
  const fetcher = new PlaylistFetcher({url: url})
  t.equals(0, fetcher.progress, 'progress was zero')

  fetcher.fetch()
  .then(res => {
    t.ok(res)
    t.equals('MediaPlaylist', res.constructor.name, 'got a MediaPlaylist')
    t.equals(100, fetcher.progress, 'progress was 100')
  }).catch(err => {
    t.fail('Should not have failed', err)
  })
}

const timeoutTest = (t) => {
  t.plan(4)
  t.timeoutAfter(3000)

  const url = hostAndPort()+'/delay/1000'
  const fetcher = new Fetcher({url: url, timeout: 100})
  t.equals(0, fetcher.progress,     'progress was zero')
  t.equals(100, fetcher._timeout,   'default timeout was 100ms')
  t.equals(url, fetcher._url,   'got correct url')

  fetcher.fetch()
  .then(res => { t.fail('We should have timed out') })
  .catch(err => {
    t.equals(err.message, 'fetch timed out', 'got timeout error')
  })
}
