import * as bytes from '../src/helpers/byte-helpers'
import TransportStream from '../src/parsers/container/ts/transport-stream'
import ElementaryStream from '../src/parsers/container/ts/elementary-stream'
import ADTS from '../src/parsers/container/ts/adts'
const test = require('tape')
const fs   = require('fs')

const ts = fs.readFileSync('./tests/fixtures/fileSequence0.ts')
const ts2 = fs.readFileSync('./tests/fixtures/master_Layer0_01195.ts')

test('parsing audio packets from a transport stream', t=> {
  let byteArray = new Uint8Array(ts)
  const stream  = TransportStream.parse(byteArray)
  let es        = stream.trackPackets[1]

  t.ok(es, 'got an elementary stream')
  let result      = ADTS.parse(es)
  let sampleFreq  = unique(result.units.map(s => s.header.samplingFreq))
  t.equals(sampleFreq.length, 1, 'all chunks had the same sampling frequency')

  t.end()
})

const unique = (arr) => {
  return arr.filter((val, idx, self) => {
    return self.indexOf(val) === idx
  })
}
