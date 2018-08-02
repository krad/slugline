const test = require('tape')
const fs   = require('fs')
import { Playlist } from '../src/playlist'
import {setupServer, tearDownServer, serverPort, hostAndPort} from './fixture-server'

const vod       = fs.readFileSync('./tests/fixtures/basic/vod.m3u8').toString()
const master    = fs.readFileSync('./tests/fixtures/basic/master.m3u8').toString()
const advMaster = fs.readFileSync('./tests/fixtures/apple-advanced-fmp4/master.m3u8').toString()
const weirdLive = fs.readFileSync('./tests/fixtures/basic/live-without-ident.m3u8').toString()

const vodURL   = '/basic/krad.tv/tractor/vod.m3u8'

test('playlist codec identification', t=> {
  t.test(setupServer, 'playlist codec identification - setup fixture server')
  t.test(identifyByFetchTestFMP4, 'identify codecs for a playlist by fetching (fragmented mp4)')
  t.test(identifyByFetchTestTS, 'identify codecs for a playlist by fetching (transport stream)')
  t.test(tearDownServer, 'playlist codec identification - teardown fixture server')
  t.end()
})

const identifyByFetchTestFMP4 = (t) => {
  t.plan(6)
  t.timeoutAfter(3000)

  const url = hostAndPort() + vodURL

  Playlist.fetch(url).then(playlist => {
    t.ok(playlist, 'fetched the playlist')
    t.notOk(playlist.codecs, 'playlist did not have codec information')

    playlist.getCodecsInformation().then(codecInfo => {
      t.ok(codecInfo, 'got codec info back')
      t.deepEquals(codecInfo, ['avc1.42001E', 'mp4a.40.2'], 'audio and video tracks correct')
      t.deepEquals(playlist.codecs, ['avc1.42001E', 'mp4a.40.2'], 'audio and video tracks correct (on playlist)')
      t.equals(playlist.codecsString, 'video/mp4; codecs="avc1.42001E,mp4a.40.2"', 'codecs string was correct (on playlist)')
    }).catch(err => {
      t.fail('Could not get codec information: ' + err)
    })

  }).catch(err => {
    t.fail('Could not fetch playlist' + err)
  })
}

const identifyByFetchTestTS = (t) => {
  t.end()
}