const test = require('tape')
const fs   = require('fs')
import { Playlist } from '../src/playlist'
import {setupServer, tearDownServer, serverPort, hostAndPort} from './fixture-server'

const vod       = fs.readFileSync('./tests/fixtures/basic/vod.m3u8').toString()
const master    = fs.readFileSync('./tests/fixtures/basic/master.m3u8').toString()
const advMaster = fs.readFileSync('./tests/fixtures/apple-advanced-fmp4/master.m3u8').toString()
const weirdLive = fs.readFileSync('./tests/fixtures/basic/live-without-ident.m3u8').toString()

const vodURL   = '/basic/krad.tv/tractor/vod.m3u8'

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
  t.notOk(playlist.renditions,                           'renditions was undefined')

  const variant = playlist.variants[0]
  t.equals('http://example.com/low.m3u8', variant.uri,  'uri was correct')
  t.equals(1280000, variant.bandwidth,                  'bandwidth was correct (variant 1)')
  t.equals(1000000, variant.avgBandwidth,               'average bandwidth was correct (variant 2)')
  t.equals(false, variant.isIFrame,                     'correctly identified as not iFrame playlist')

  const last = playlist.variants[playlist.variants.length-1]
  t.equals('mp4a.40.5', last.codecs,                    'got codec info for the last variant')
  t.end()
})

test('attributes from an advanced Master Playlist', t=> {

  const playlist = Playlist.parse(advMaster)
  t.ok(playlist, 'got a playlist')
  t.equals('MasterPlaylist', playlist.constructor.name, 'got a MasterPlaylist')
  t.equals(30, playlist.variants.length,                'got correct amount of variants')

  const variant = playlist.variants[0]
  t.equals('v5/prog_index.m3u8', variant.uri,   'uri was correct')
  t.equals('960x540', variant.resolution,       'resolution was correct')
  t.equals(60.0, variant.frameRate,             'frameRate was correct')
  t.equals('cc1', variant.closedCaptionsIdent,  'closedCaptionsIdent was correct')
  t.equals('aud1', variant.audioIdent,          'audioIdent was correct')
  t.equals('sub1', variant.subtitlesIdent,      'subtitlesIdent was correct')

  const iframeVariant = playlist.variants[29]
  t.equals(true, iframeVariant.isIFrame,              'correctly identified as iFrame playlist')
  t.equals('v2/iframe_index.m3u8', iframeVariant.uri, 'correctly parsed/set uri')

  t.equals(24, playlist.regularVariants.length, 'correctly returned list of non iFrame variants')
  t.equals(6, playlist.iFrameVaraints.length,   'correctly return list of iFrame only variants')

  t.ok(playlist.renditions,               'renditions were present')
  t.equals(5, playlist.renditions.length, 'got correct amount of renditions')

  const rendition = playlist.renditions[0]
  t.equals('AUDIO', rendition.type,             'got correct rendtion type')
  t.equals('aud1', rendition.groupId,           'got correct group id')
  t.equals('English', rendition.name,           'got correct name')
  t.equals('a1/prog_index.m3u8', rendition.uri, 'got correct uri')
  t.equals(true, rendition.default,             'got correct default pref')
  t.equals(true, rendition.autoselect,          'got correct value of autoselect')
  t.equals(false, rendition.forced,             'got correct value of forced')
  t.equals(2, rendition.channels,               'got correct value of channels')
  t.equals('en', rendition.language,            'got correct value of language')

  t.end()
})

test('identifying a live playlist', t=> {
  const playlist = Playlist.parse(weirdLive)
  t.equals('LIVE', playlist.type, 'correctly identified as LIVE')
  t.end()
})

test('fetching a playlist', t=> {
  t.test(setupServer,     'fetching a playlist - setup the fixture server')
  t.test(fetchTest,       'fetching a playlist and segments')
  t.test(tearDownServer,  'fetching a playlist - tore down the fixture server')
  t.end()
})

test('sequentially fetching segments in a playlist', t=> {
  t.test(setupServer,           'fetching playlist segments sequentially - setup the fixture server')
  t.test(sequentialFetchTest,   'fetching a playlists segments ')
  t.test(tearDownServer,        'fetching playlist segments sequentially  - tore down the fixture server')
  t.end()
})

test('preventing segment update overwrites', t=> {

  const srcA = fs.readFileSync('./tests/fixtures/basic/event-inprogress-a.m3u8').toString()
  const srcB = fs.readFileSync('./tests/fixtures/basic/event-inprogress-b.m3u8').toString()

  // Parse the first playlist
  const playlistA = Playlist.parse(srcA)
  t.ok(playlistA, 'parsed original playlist')
  t.equals(11, playlistA.segments.length, 'segment length was correct')

  // Parse the updated playlist
  const playlistB = Playlist.parse(srcB)
  t.ok(playlistB, 'parsed updated playlist')
  t.equals(12, playlistB.segments.length, 'segment length was correct')

  // Make sure they're not equal
  t.notDeepEqual(playlistA, playlistB)

  // Taint the original playlist's segments
  playlistA.segments.forEach(segment => segment.tainted = true )
  playlistA.updateSegments(playlistB.segments)
  t.equals(12, playlistB.segments.length, 'segment length was bumped')

  t.equals(true, playlistA.segments[0].tainted,   'segment still marked as tained #1')
  t.equals(true, playlistA.segments[1].tainted,   'segment still marked as tained #2')
  t.equals(true, playlistA.segments[2].tainted,   'segment still marked as tained #3')
  t.equals(true, playlistA.segments[3].tainted,   'segment still marked as tained #4')
  t.equals(true, playlistA.segments[4].tainted,   'segment still marked as tained #5')
  t.equals(true, playlistA.segments[5].tainted,   'segment still marked as tained #6')
  t.equals(true, playlistA.segments[6].tainted,   'segment still marked as tained #7')
  t.equals(true, playlistA.segments[7].tainted,   'segment still marked as tained #8')
  t.equals(true, playlistA.segments[8].tainted,   'segment still marked as tained #9')
  t.equals(true, playlistA.segments[9].tainted,   'segment still marked as tained #10')
  t.equals(true, playlistA.segments[10].tainted,  'segment still marked as tained #11')
  t.equals(undefined, playlistA.segments[11].tainted, 'new segment was not tainted #12')

  const srcC = fs.readFileSync('./tests/fixtures/basic/live-inprogress-a.m3u8').toString()
  const srcD = fs.readFileSync('./tests/fixtures/basic/live-inprogress-b.m3u8').toString()

  const playlistC = Playlist.parse(srcC)
  t.ok(playlistC, 'parsed original live playlist')
  t.equals('LIVE', playlistC.type, 'it is a live playlist')
  t.equals(4, playlistC.segments.length, 'correct amount of segments')

  const playlistD = Playlist.parse(srcD)
  t.ok(playlistD, 'parsed new live playlist')
  t.ok(playlistD, 'parsed original live playlist')
  t.equals('LIVE', playlistD.type, 'it is a live playlist')
  t.equals(4, playlistD.segments.length, 'correct amount of segments')

  t.notDeepEqual(playlistC, playlistD, 'they are not equal')

  playlistC.segments.forEach(segment => segment.tainted = true )
  playlistC.updateSegments(playlistD.segments)

  t.equals(true, playlistC.segments[0].tainted, 'segment still marked as tained #1')
  t.equals(true, playlistC.segments[1].tainted, 'segment still marked as tained #1')
  t.equals(true, playlistC.segments[2].tainted, 'segment still marked as tained #1')
  t.equals(undefined, playlistC.segments[3].tainted, 'new segment not tainted')

  t.end()
})

const fetchTest = (t) => {
  t.plan(114)
  t.timeoutAfter(4000)

  const url = hostAndPort()+vodURL
  Playlist.fetch(url)
  .then(playlist => {
    t.ok(playlist, 'fetch completed with a response')
    t.equals('MediaPlaylist', playlist.constructor.name, 'it was MediaPlaylist')
    t.equals('VOD', playlist.type, 'it was a VOD')

    const basePath = hostAndPort()+'/basic/krad.tv/tractor'
    t.equals(basePath, playlist.basePath, 'base path was correct')

    playlist.segments.forEach(segment => {
      t.equals(basePath, segment.basePath, 'base path was correct ' + segment.uri)
      t.equals(basePath+'/'+segment.uri, segment.url, 'segment url was correct ' + segment.url)

      segment.fetch().then(data => {
        t.ok(data, 'got data back ' + segment.uri)
        t.ok(segment.data, 'segment had data set ' + segment.uri)
        t.equals(100, segment.progress, 'segment had progress ' + segment.uri)
      }).catch(err => {
        t.fail('Failed to fetch segment ' + segment.uri + ' ' + err)
      })

    })

  }).catch(err => {
    console.log(err);
    t.fail('We should not have failed')
  })
}

const sequentialFetchTest = (t) => {
  t.plan(8)
  t.timeoutAfter(3000)
  let playlist      = Playlist.parse(vod)
  playlist.basePath = hostAndPort()+'/basic/krad.tv/tractor'

  const segmentCount = playlist.segments.length
  t.equals(7, segmentCount, 'correct amount of segments present')

  let fetches = []
  let progress = []

  const onNext = (segment) => fetches.push(segment)
  const onProgress = (x) => progress.push(x)

  playlist.fetchSequentially(onNext, onProgress).then(res =>{
    t.ok(res, 'got a response')
    t.equals('MediaPlaylist', res.constructor.name, 'got a reference to the playlist back')
    t.equals(res, playlist, 'the response and our playlist were equal')
    t.equals(segmentCount, fetches.length, 'fetched each of the segments')
    t.ok(progress.length > 0, 'we got some progress callbacks')

    const first = progress.filter(p => p.uri == 'fileSeq1.mp4')
    t.notEqual(0, first[0].progress, 'progress was not zero')
    t.equals(100, first[first.length-1].progress, 'last entry was 100')
  }).catch(err => {
    console.log(err);
    t.fail('We should not have failed')
  })

  // console.log(playlist);

}
