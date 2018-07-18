const test = require('tape')
import { Fetcher, PlaylistFetcher } from '../src/fetcher'
import {setupServer, tearDownServer, serverPort, hostAndPort} from './fixture-server'

test('fetcher behavior', t=> {
  t.test(setupServer,             'fetcher behavior - setup the fixture server')
  t.test(fetchingPlaylistTest,    'should fetch a playlist')
  t.test(fetchingAMediaFile,      'should fetch a media file')
  t.test(timeoutTest,             'test fetcher timeout behavior')
  t.test(tearDownServer,          'fetcher behavior - tore down the fixture server')
  t.end()
})

const fetchingPlaylistTest = (t) => {
  t.plan(7)
  t.timeoutAfter(3000)

  const url     = hostAndPort()+'/basic/krad.tv/tractor/vod.m3u8'
  const fetcher = new PlaylistFetcher({url: url})
  t.equals(0, fetcher.progress, 'progress was zero')

  fetcher.fetch()
  .then(res => {
    t.ok(res)
    t.equals('MediaPlaylist', res.constructor.name, 'got a MediaPlaylist')
    t.equals(100.0, fetcher.progress, 'progress was 100')
    t.ok(fetcher.headers)
    t.equals(1002, fetcher.contentLength, 'content length was correct')
    t.equals(1002, fetcher.contentRead,   'content read was correct')
  }).catch(err => {
    t.fail('Should not have failed', err)
  })
}

const fetchingAMediaFile = (t) => {
  t.plan(4)
  t.timeoutAfter(3000)

  const url     = hostAndPort()+'/basic/krad.tv/tractor/fileSeq1.mp4'
  const fetcher = new Fetcher({url: url})
  t.equals(0, fetcher.progress, 'progress was zero')

  fetcher.fetch()
  .then(res => {
    t.ok(res, 'response present')
    t.equals(691923, fetcher.contentLength, 'content length was correct')
    t.equals(691923, fetcher.contentRead,   'content read was correct')
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
