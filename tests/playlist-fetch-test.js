import { Playlist } from '../src/playlist'
import {setupServer, tearDownServer, serverPort, hostAndPort} from './fixture-server'
const test = require('tape')
const fs = require('fs')

const srcA = './tests/fixtures/basic/event-inprogress-a.m3u8'
const srcB = './tests/fixtures/basic/event-inprogress-b.m3u8'
const srcC = './tests/fixtures/basic/event-inprogress-c.m3u8'
const srcD = './tests/fixtures/basic/event-inprogress-d.m3u8'
const srcE = './tests/fixtures/basic/event-inprogress-e.m3u8'
const dst  = './tests/fixtures/basic/event-inprogress-scratch.m3u8'

const srcF = './tests/fixtures/basic/live-inprogress-a.m3u8'
const srcG = './tests/fixtures/basic/live-inprogress-b.m3u8'
const dstL = './tests/fixtures/basic/live-inprogress-scratch.m3u8'

test('refreshing an event playlist', t=> {
  t.test(setupServer,     'refreshing an event playlist - started fixture server')
  t.test(testRefresh,     'refreshing an event playlist')
  t.test(testAutoRefresh, 'refreshing an event playlist at an interval')
  t.test(testRefreshLive, 'refreshing a live playlist')
  t.test(tearDownServer,  'refreshing an event playlist - tore down fixture server')
  t.end()
})

const testRefresh = (t) => {
  t.plan(17)
  t.timeoutAfter(3000)

  fs.copyFileSync(srcA, dst)

  const url = hostAndPort() + '/basic/event-inprogress-scratch.m3u8'

  Playlist.fetch(url).then(playlist => {

    t.equals('MediaPlaylist', playlist.constructor.name, 'got MediaPlaylist')
    t.equals(11, playlist.segments.length, 'has 11 segments')
    t.equals(false, playlist.ended, 'event has not ended')

    t.equals(0,  playlist.segments[0].id, 'id was correct 0')
    t.equals(1,  playlist.segments[1].id, 'id was correct 1')
    t.equals(2,  playlist.segments[2].id, 'id was correct 2')
    t.equals(3,  playlist.segments[3].id, 'id was correct 3')
    t.equals(4,  playlist.segments[4].id, 'id was correct 4')
    t.equals(5,  playlist.segments[5].id, 'id was correct 5')
    t.equals(6,  playlist.segments[6].id, 'id was correct 6')
    t.equals(7,  playlist.segments[7].id, 'id was correct 7')
    t.equals(8,  playlist.segments[8].id, 'id was correct 8')
    t.equals(9,  playlist.segments[9].id, 'id was correct 9')
    t.equals(10, playlist.segments[10].id, 'id was correct 10')

    fs.copyFileSync(srcB, dst)
    playlist.refresh().then(refreshed => {
      t.equals('MediaPlaylist', refreshed.constructor.name, 'refreshed MediaPlaylist')
      t.equals(12, playlist.segments.length, 'appended new segments')
      t.equals(11, playlist.segments[11].id, 'id was correct 11')
    }).catch(err => {
      t.fail('Failed to refresh the playlist ' + err)
    })


  }).catch(err => {
    t.fail('Failed to fetch the playlist')
  })

}

const testAutoRefresh = (t) => {
  t.plan(13)

  // Create a refresh callback that shuffles the next playlists and
  // runs assertions on the refreshed playlist
  let playlistUpdates   = [srcD, srcE]
  const refreshCallback = (playlist) => {
    const nextPlaylist = playlistUpdates.shift()

    if (nextPlaylist) {
      fs.copyFileSync(nextPlaylist, dst)
      t.equals(false, playlist.ended, 'playlist not ended yet')
      t.ok(playlist.refreshTimer,     'refreshTimer still present')
      console.log(nextPlaylist, '/ Segment count:', playlist.segments.length);
    } else {
      t.equals(true, playlist.ended, 'playlist is ended now')
      t.notOk(playlist.refreshTimer, 'refreshTimer was removed')
    }
  }

  /// Reset the playlist
  fs.copyFileSync(srcB, dst)

  // Fetch the original playlist
  const url = hostAndPort() + '/basic/event-inprogress-scratch.m3u8'
  Playlist.fetch(url).then(playlist => {

    // Verify some assumptions about the initial playlist
    t.equals('MediaPlaylist',           playlist.constructor.name, 'got MediaPlaylist')
    t.equals(12,                        playlist.segments.length,  'has 12 segments')
    t.equals(false,                     playlist.ended,            'event has not ended')
    t.equals(4.490116084436116,         playlist.avgDuration,      'had correct avg duration')
    t.equals(playlist.avgDuration*1000, playlist.refreshInterval,  'refresh interval correct')
    t.equals(false,                     playlist.ended,            'playlist not ended')
    t.notOk(playlist.refreshTimer, 'refreshTimer was not present')

    // Prepare the next playlist and start the auto refresh
    fs.copyFileSync(srcC, dst)
    playlist.startAutoRefresh(refreshCallback)

  }).catch(err => {
    t.fail('Failed to fetch the playlist ' + err)
  })

}

const testRefreshLive = (t) => {
  t.plan(17)
  t.timeoutAfter(3000)

  fs.copyFileSync(srcF, dstL)
  const url = hostAndPort() + '/basic/live-inprogress-scratch.m3u8'

  Playlist.fetch(url).then(playlist => {
    t.equals('MediaPlaylist', playlist.constructor.name, 'got MediaPlaylist')
    t.equals('LIVE', playlist.type, 'was a LIVE playlist')
    t.equals(false, playlist.ended, 'live event has not ended')
    t.equals(4, playlist.segments.length, 'had 3 segments')

    t.equals(0, playlist.segments[0].id, 'id was 0')
    t.equals(1, playlist.segments[1].id, 'id was 1')
    t.equals(2, playlist.segments[2].id, 'id was 2')
    t.equals(3, playlist.segments[3].id, 'id was 3')

    fs.copyFileSync(srcG, dstL)
    playlist.refresh().then(refreshedPlaylist => {

      t.ok(refreshedPlaylist, 'got a refreshed playlist back')
      t.equals('MediaPlaylist', playlist.constructor.name, 'got MediaPlaylist')
      t.equals('LIVE', playlist.type, 'was a LIVE playlist')
      t.equals(false, playlist.ended, 'live event has not ended')
      t.equals(4, playlist.segments.length, 'had 3 segments')

      t.equals(0, playlist.segments[0].id, 'id was 0')
      t.equals(2, playlist.segments[1].id, 'id was 2')
      t.equals(3, playlist.segments[2].id, 'id was 3')
      t.equals(4, playlist.segments[3].id, 'id was 4')

    }).catch(err => {
      t.fail('Failed to refresh playlist ' + err)
    })


  }).catch(err => {
    t.fail('Failed to fetch the playlist ' + err)
  })

}
