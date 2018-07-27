const test  = require('tape')
const fs    = require('fs')
import TransportStream from '../src/parsers/container/ts/transport-stream'

const ts = fs.readFileSync('./tests/fixtures/master_Layer0_01195.ts')

test.only('we can parse ts files', t=> {

  let byteArray = new Uint8Array(ts)
  const stream = TransportStream.parse(byteArray)
  t.equals(stream.packets.length, 2300, 'got correct amount of packets')

  // const uniqueLength = unique(stream.packets.map(p => p.length))
  // t.equals(1, uniqueLength.length, 'all packets had the same size')
  // t.equals(188, uniqueLength[0], 'they were all 188 bytes')
  //
  // const syncBytes = unique(stream.packets.map(p => p.syncByte))
  // t.equals(1, syncBytes.length, 'all packets had the same sync byte')
  // t.equals(0x47, syncBytes[0], 'they were all genuine sync bytes')

  // console.log(stream.packets.filter(p => p.PRIORITY !== 0));

  t.end()
})

const unique = (arr) => {
  return arr.filter((val, idx, self) => {
    return self.indexOf(val) === idx
  })
}
