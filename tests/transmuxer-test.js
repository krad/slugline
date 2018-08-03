import { TransportStream } from '../src/slugline'
import Transmuxer from '../src/transmuxing/transmuxer'
const test = require('tape')
const fs = require('fs')

const tsURL = './tests/fixtures/apple-basic-ts/gear1/fileSequence0.ts'
const asset = fs.readFileSync(tsURL)

const out = '/tmp/ftyp.mp4'

test('that we can create an init segment from a ts file', t=> {

  const buffer = Uint8Array.from(asset)
  let ts = TransportStream.parse(buffer)
  t.equals(1551, ts.packets.length, '😃')

  let muxer       = new Transmuxer(ts)
  let initSegment = muxer.buildInitializationSegment()
  t.ok(initSegment, 'we got an init segment')

  initSegment.forEach(s => {
    fs.appendFileSync(out, new Buffer(s))
  })

  console.log(initSegment);



  t.end()
})
