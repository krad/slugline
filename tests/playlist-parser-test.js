const test = require('tape')
const fs   = require('fs')
import { PlaylistParser, parseTagsAndAttributes } from '../src/parsers/playlist/playlist-parser'

const vod     = fs.readFileSync('./tests/fixtures/basic/vod.m3u8').toString()
const master  = fs.readFileSync('./tests/fixtures/basic/master.m3u8').toString()
const invalid = fs.readFileSync('./tests/fixtures/basic/invalid.m3u8').toString()
const akamai  = fs.readFileSync('./tests/fixtures/basic/akamai-style.m3u8').toString()

test('that we throw when we attempt to parse something that is not a playlist', t=>{

  const throwFunc   = () => { PlaylistParser.parse('hi') }
  const noThrowFunc = () => { PlaylistParser.parse(vod) }
  const invalidFunc = () => { PlaylistParser.parse(invalid) }
  const badFunc     = () => { PlaylistParser.parse('#EXTM3U')}

  t.throws(throwFunc, /not valid playlist/,  'threw not valid playlist')
  t.doesNotThrow(noThrowFunc)
  t.throws(invalidFunc, /playlist had media & master tags/, 'threw not valid playlist')
  t.throws(badFunc, /not valid playlist/, 'threw not valid playlist')

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

  t.ok(results[7]['#EXTINF'].duration, 'duration present')
  t.ok(results[7]['#EXTINF'].title, 'duration present')
  t.equals(6.006226722, results[7]["#EXTINF"].duration, 'float precision correct')
  t.equals('First Sequence Title', results[7]['#EXTINF'].title, 'Title sequence present')

  t.end()
})

test('that we can tell the difference between media & master playlists', t=>{

  const mediaPlaylist = PlaylistParser.parse(vod)
  t.ok(mediaPlaylist, 'successfully parsed playlist')
  t.equals('MediaPlaylist', mediaPlaylist.constructor.name, 'playlist was a MediaPlaylist')

  const masterPlaylist = PlaylistParser.parse(master)
  t.ok(masterPlaylist, 'successfully parsed playlist')
  t.equals('MasterPlaylist', masterPlaylist.constructor.name, 'playlist was a MasterPlaylist')

  t.end()
})

test('that we can properly parse akamai style playlists', t=> {
  const mediaPlaylist = PlaylistParser.parse(akamai)
  t.ok(mediaPlaylist)
  t.equals(1078, mediaPlaylist.segments.length, 'parsed the segments correctly')
  t.equals('https://showthing-lh.akamaihd.net/i/RealNews_1@561924/segment153491273_800_av-p.ts?sd=10&rebase=on', mediaPlaylist.segments[0].url)
  t.end()
})
