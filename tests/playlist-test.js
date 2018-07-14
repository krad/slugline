const test = require('tape')
const fs   = require('fs')
import { Playlist } from '../src/playlist'

const vod = fs.readFileSync('./tests/fixtures/vod.m3u8').toString()

test('basic attributes from a playlist', t=>{

  const playlist = Playlist.parse(vod)
  t.ok(playlist, 'got a playlist')
  t.equals('MediaPlaylist', playlist.constructor.name, 'got a MediaPlaylist')
  t.equals(6, playlist.targetDuration,                 'target duration was set')
  t.equals(7, playlist.version,                        'version was correct')
  t.equals(1, playlist.mediaSequenceNumber,            'media sequence number was correct')
  t.equals('VOD', playlist.type,                       'identified as a VOD playlist')
  t.equals(7, playlist.segments.length,                'got correct amount of segments')
  t.equals(true, playlist.ended,                       'playlist correctly marked as ended')

  const initSegment = playlist.segments[0]
  t.equals('fileSeq0.mp4', initSegment.uri)

  const mediaSegment = playlist.segments[1]
  t.equals(6.006226722, mediaSegment.duration, 'first segment had correct duration')
  t.equals('First Sequence Title', mediaSegment.title, 'title was present on first segment')

  console.log(playlist);

  t.end()
})
