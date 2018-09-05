///// TESTS IN HERE SHOULD NEVER BE RUN.
///// THIS IS A SCRATCH PAD FOR DIAGNOSING PROBLEMS WITH STREAMS

const test = require('tape')
const fs = require('fs')

import TransportStream from '../src/parsers/container/ts/transport-stream'
import TransportStreamParser from '../src/parsers/container/ts/parser'
import ElementaryStream from '../src/parsers/container/ts/elementary-stream'
import PESPacket from '../src/parsers/container/ts/pes-packet'
import { buildRBSP } from '../src/parsers/container/ts/nalu'
import base64ArrayBuffer from '../src/parsers/container/ts/base64'
import * as bytes from '../src/helpers/byte-helpers'


test.skip('parsing a random segment to diagnose what is wrong', t=> {

  const fixture = fs.readFileSync('./tests/fixtures/pbs.ts')
  const ts      = TransportStream.parse(fixture)
  t.ok(ts, 'was able to parse the transport stream')

  console.log(ts.trackPackets);


  t.end()
})
