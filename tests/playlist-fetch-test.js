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

test('refreshing an event playlist', t=> {
  t.test(setupServer,     'refreshing an event playlist - started fixture server')
  t.test(testRefresh,     'refreshing an event playlist')
  t.test(testAutoRefresh, 'refreshing an event playlist at an interval')
  t.test(tearDownServer,  'refreshing an event playlist - tore down fixture server')
  t.end()
})

const testRefresh = (t) => {
  t.plan(5)
  t.timeoutAfter(3000)

  fs.copyFileSync(srcA, dst)

  const url = hostAndPort() + '/basic/event-inprogress-scratch.m3u8'

  Playlist.fetch(url).then(playlist => {

    t.equals('MediaPlaylist', playlist.constructor.name, 'got MediaPlaylist')
    t.equals(11, playlist.segments.length, 'has 11 segments')
    t.equals(false, playlist.ended, 'event has not ended')
    fs.copyFileSync(srcB, dst)

    playlist.refresh().then(refreshed => {
      t.equals('MediaPlaylist', refreshed.constructor.name, 'refreshed MediaPlaylist')
      t.equals(12, playlist.segments.length, 'appended new segments')
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
