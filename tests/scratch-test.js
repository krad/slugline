///// TESTS IN HERE SHOULD NEVER BE RUN.
///// THIS IS A SCRATCH PAD FOR DIAGNOSING PROBLEMS WITH STREAMS

const test = require('tape')
const fs = require('fs')

import { Playlist } from '../src/playlist'
import TransportStream from '../src/parsers/container/ts/transport-stream'
import TransportStreamParser from '../src/parsers/container/ts/parser'
import ElementaryStream from '../src/parsers/container/ts/elementary-stream'
import PESPacket from '../src/parsers/container/ts/pes-packet'
import { buildRBSP } from '../src/parsers/container/ts/nalu'
import * as bytes from '../src/helpers/byte-helpers'

test.skip('parsing a random segment to diagnose what is wrong', t=> {

  const fixture = fs.readFileSync('./tests/fixtures/pbs.ts')
  const ts      = TransportStream.parse(fixture)
  t.ok(ts, 'was able to parse the transport stream')

  const accessUnits = ts.tracks.filter(t => t.streamType === 27)[0]
  let accessUnit    = accessUnits.units.filter(au => au.isKeyFrame === true)[0]
  let sps           = accessUnit.nalus.filter(n => n.nal_unit_type === 7)[0]
  let pps           = accessUnit.nalus.filter(n => n.nal_unit_type === 8)[0]
  // console.log(accessUnits);

  t.end()
})

test.skip('fetching a problematic playlist', t=> {

  t.plan(1)

  const url = 'http://iphone-streaming.ustream.tv/uhls/10414700/streams/live/iphone/playlist.m3u8'

  Playlist.fetch(url)
  .then(playlist => {
    t.ok(playlist, 'fetched the playlist')
    console.log(playlist);
  })
  .catch(err => {
    t.fail('Failed to fetch the playlist')
    console.log(err);
  })

})
