const test = require('tape')
const fs   = require('fs')
import { Playlist } from '../src/playlist'
import {setupServer, tearDownServer, serverPort, hostAndPort} from './fixture-server'

const vodURL   = '/basic/krad.tv/tractor/vod.m3u8'
const vodTSURL = '/apple-basic-ts/gear1/prog_index.m3u8'

test('playlist codec identification', t=> {
  t.test(setupServer, 'playlist codec identification - setup fixture server')
  t.test(identifyByFetchTestFMP4, 'identify codecs for a playlist by fetching (fragmented mp4)')
  t.test(identifyByFetchTestTS, 'identify codecs for a playlist by fetching (transport stream)')
  t.test(tearDownServer, 'playlist codec identification - teardown fixture server')
  t.end()
})

const identifyByFetchTestFMP4 = (t) => {
  t.plan(7)
  t.timeoutAfter(3000)

  const url = hostAndPort() + vodURL

  Playlist.fetch(url).then(playlist => {
    t.ok(playlist, 'fetched the playlist')
    t.notOk(playlist.codecs, 'playlist did not have codec information')

    playlist.getCodecsInformation().then(codecInfo => {
      t.equals('fmp4', playlist.segmentsType)
      t.ok(codecInfo, 'got codec info back')
      console.log(codecInfo)

      t.deepEquals(codecInfo, ['avc1.42001E', 'mp4a.40.2'], 'audio and video tracks correct')
      t.deepEquals(playlist.codecs, ['avc1.42001E', 'mp4a.40.2'], 'audio and video tracks correct (on playlist)')
      t.equals(playlist.codecsString, 'video/mp4; codecs="avc1.42001E,mp4a.40.2"', 'codecs string was correct (on playlist)')
    }).catch(err => {
      t.fail('Could not get codec information: ' + err)
    })

  }).catch(err => {
    t.fail('Could not fetch playlist: ' + err)
  })
}

const identifyByFetchTestTS = (t) => {
  t.plan(3)
  t.timeoutAfter(3000)

  const url = hostAndPort() + vodTSURL

  Playlist.fetch(url).then(playlist => {
    t.ok(playlist, 'fetched the playlist')
    t.notOk(playlist.codecs, 'playlist did not have codec information')

    playlist.getCodecsInformation().then(codecInfo => {
      t.equals('ts', playlist.segmentsType)
      console.log(codecInfo);
    }).catch(err => {
      t.fail('Could not get codec information: ', err)
    })

  }).catch(err => {
    t.fail('Could not fetch playlist: ' + err)
  })

}
