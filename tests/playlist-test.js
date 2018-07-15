const test = require('tape')
const fs   = require('fs')
import { Playlist } from '../src/playlist'

const vod     = fs.readFileSync('./tests/fixtures/basic/vod.m3u8').toString()
const master  = fs.readFileSync('./tests/fixtures/basic/master.m3u8').toString()

test('basic attributes from a VOD playlist', t=>{

  const playlist = Playlist.parse(vod)
  t.ok(playlist, 'got a playlist')
  t.equals('MediaPlaylist', playlist.constructor.name, 'got a MediaPlaylist')
  t.equals(6, playlist.targetDuration,                 'target duration was set')
  t.equals(7, playlist.version,                        'version was correct')
  t.equals(1, playlist.mediaSequenceNumber,            'media sequence number was correct')
  t.equals('VOD', playlist.type,                       'identified as a VOD playlist')
  t.equals(7, playlist.segments.length,                'got correct amount of segments')
  t.equals(27.028028262, playlist.totalDuration,       'total duration was present and correct')
  t.equals(true, playlist.ended,                       'playlist correctly marked as ended')

  const initSegment = playlist.segments[0]
  t.equals('fileSeq0.mp4', initSegment.uri)

  const mediaSegment = playlist.segments[1]
  t.equals(6.006226722, mediaSegment.duration, 'first segment had correct duration')
  t.equals('First Sequence Title', mediaSegment.title, 'title was present on first segment')

  console.log(playlist);

  t.end()
})

test('basic attributes from a Master playlist', t=> {

  const playlist = Playlist.parse(master)
  t.ok(playlist, 'got a playlist')
  t.equals('MasterPlaylist', playlist.constructor.name, 'got a MasterPlaylist')
  t.equals(4, playlist.variants.length,                 'got correct amount of variants')

  const variant = playlist.variants[0]
  t.equals('http://example.com/low.m3u8', variant.uri,  'uri was correct')
  t.equals(1280000, variant.bandwidth,                  'bandwidth was correct (variant 1)')
  t.equals(1000000, variant.avgBandwidth,               'average bandwidth was correct (variant 2)')

  const last = playlist.variants[playlist.variants.length-1]
  t.equals('mp4a.40.5', last.codecs,                    'got codec info for the last variant')
  t.end()
})
