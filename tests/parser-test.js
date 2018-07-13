const test = require('tape')
const fs   = require('fs')
import { Parser, parseTagsAndAttributes } from '../src/parser'

const vod     = fs.readFileSync('./tests/fixtures/vod.m3u8').toString()
const master  = fs.readFileSync('./tests/fixtures/master.m3u8').toString()

test('that we throw when we attempt to parse something that is not a playlist', t=>{
  const throwFunc   = () => { Parser.parse('hi') }
  const noThrowFunc = () => { Parser.parse(vod) }

  t.throws(throwFunc, /not valid playlist/,  'threw not valid playlist')
  t.doesNotThrow(noThrowFunc)
  t.end()
})

test('that we can build a raw structure from a playlist', t=> {

  const results = parseTagsAndAttributes(vod)
  t.ok(results)
  t.equals('#EXTM3U', results[0], 'got playlist tag')
  t.equals('#EXT-X-ENDLIST', results[results.length-1], 'got the end tag')

  t.equals(6, results[1]["#EXT-X-TARGETDURATION"], 'target duration correct')
  t.equals(7, results[2]["#EXT-X-VERSION"], 'playlist version correct')
  t.equals(1, results[3]["#EXT-X-MEDIA_SEQUENCE"], 'media sequence correct')
  t.equals('VOD', results[4]["#EXT-X-PLAYLIST-TYPE"], 'playlist type correct')

  t.equals(6.006226722, results[7]["#EXTINF"], 'float precision correct')

  console.log(results);

  t.end()
})

test('that we can tell the difference between media & master playlists', t=>{

  const mediaPlaylist = Parser.parse(vod)
  t.ok(mediaPlaylist, 'successfully parsed playlist')
  t.equals('MediaPlaylist', mediaPlaylist.constructor.name, 'playlist was a MediaPlaylist')

  const masterPlaylist = Parser.parse(master)
  t.ok(masterPlaylist, 'successfully parsed playlist')
  t.equals('MasterPlaylist', masterPlaylist.constructor.name, 'playlist was a MasterPlaylist')

  t.end()
})
