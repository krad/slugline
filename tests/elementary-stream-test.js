import * as bytes from '../src/helpers/byte-helpers'
import TransportStream from '../src/parsers/container/ts/transport-stream'
import ElementaryStream from '../src/parsers/container/ts/elementary-stream'
import AccessUnit from '../src/parsers/container/ts/access-unit'
import ADTS from '../src/parsers/container/ts/adts'
const test = require('tape')
const fs   = require('fs')

const ts = fs.readFileSync('./tests/fixtures/fileSequence0.ts')
const ts2 = fs.readFileSync('./tests/fixtures/master_Layer0_01195.ts')

test('that we can parse an elementary stream', t=> {

  const stream = [0, 0, 0, 1, 0x42, 0x42, 0x42,
                  0, 0, 0, 1, 0x43, 0x43, 0x43,
                  0, 0, 0, 1, 0x44, 0x44, 0x44,
                  0, 0, 1,    0x45, 0x45, 0x45]

  let itr = bytes.elementaryStreamIterator(stream)

  let a = itr.next()
  t.ok(a, 'got a result back')
  t.deepEquals(a, [0x42, 0x42, 0x42], 'it was the segment we expected (0x42)')

  let b = itr.next()
  t.ok(b, 'got next segment')
  t.deepEquals(b, [0x43, 0x43, 0x43], 'it was the segment we exepected (0x43)')

  let c = itr.next()
  t.ok(c, 'got next segment')
  t.deepEquals(c, [0x44, 0x44, 0x44, 0, 0, 1, 0x45, 0x45, 0x45], 'it was the segment we expected (0x44)')

  let d = itr.next()
  t.notOk(d, 'we reached the end of the segments')

  /// now try the 3 byte version
  let itr2 = bytes.elementaryStreamIterator(stream, [0x00, 0x00, 0x01])
  let e    = itr2.next()
  t.ok(e, 'got a result back')
  t.deepEquals(e, [0x42, 0x42, 0x42, 0x00], 'got expected segment with trailing 0')

  let f = itr2.next()
  t.ok(f, 'got a result back')
  t.deepEquals(f, [0x43, 0x43, 0x43, 0x00], 'got expected segment with trailing 0')

  let g = itr2.next()
  t.ok(g, 'got a result back')
  t.deepEquals(g, [0x44, 0x44, 0x44], 'got expected segment back')

  let h = itr2.next()
  t.ok(h, 'got a result back')
  t.deepEquals(h, [0x45, 0x45, 0x45], 'got expected segment back')

  t.notOk(itr2.next(), 'at end of stream, no result')

  t.end()
})


test('that we can parse an elementary stream that spans across packets', t=> {

  const stream = [[0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0x88, 0x99],
                  [0x42, 0x42, 0x42, 0, 0 ,1, 0x42],
                  [0x43, 0x43, 0x43, 0, 0, 0, 0],
                  [1, 0x44, 0x44, 0x44, 0, 0, 0, 0],
                  [0, 1, 0x45, 0x45, 0x45]]

  let itr = bytes.elementaryStreamIterator(stream, [0, 0, 1])

  let a = itr.next()
  t.ok(a, 'got first segment')
  t.deepEquals(a, [0x88, 0x99, 0x42, 0x42, 0x42], 'it was the segment we expected (0x42)')

  let b = itr.next()
  t.ok(b, 'got  next segment')
  t.deepEquals(b, [0x42, 0x43, 0x43, 0x43, 0x00, 0x00], 'it was the segment we expected (0x43)')

  let c = itr.next()
  t.ok(c, 'got next segment')
  t.deepEquals(c, [0x44, 0x44, 0x44, 0x00, 0x00, 0x00], 'it was the segment we expected (0x44)')

  let d = itr.next()
  t.ok(d, 'got next segment')
  t.deepEquals(d, [0x45, 0x45, 0x45], 'it was the segment we expected (0x45)')

  t.notOk(itr.next(), 'got undefined at the end of the stream')

  t.end()
})

test('that we can parse parse packets from an elementary stream', t=> {

  const stream = [[0, 0, 0, 0, 0, 0, 0, 1, 0xe0, 66, 66, 66, 66],
                  [0, 0, 0, 0, 1, 0x43, 0x43, 0x43, 0x43, 0, 0, 1, 0xe0, 0x44],
                  [0x44, 0x44, 0x44, 0, 0, 0, 0, 1, 0xe0, 0x45, 0x45],
                  [0x45, 0x45, 0xe0, 0, 0, 0, 1, 0xe0, 0, 0, 0, 2]]

  let itr = bytes.elementaryStreamIterator(stream, [0x00, 0x00, 0x01, 0xe0], true)

  let a = itr.next()
  t.ok(a, 'got a chunk back')
  t.deepEquals(a, [0x00, 0x00, 0x01, 0xe0, 66, 66, 66, 66, 0, 0, 0, 0, 1, 67, 67, 67, 67], 'got first packet')

  let b = itr.next()
  t.ok(b, 'got the next chunk')
  t.deepEquals(b, [0x00, 0x00, 0x01, 0xe0, 0x44, 0x44, 0x44, 0x44, 0x00, 0x00], 'got the next packet')

  let c = itr.next()
  t.ok(c, 'got the next chunk')
  t.deepEquals(c, [0x00, 0x00, 0x01, 0xe0, 0x45, 0x45, 0x45, 0x45, 0xe0, 0x00], 'got the correct bytes')

  let d = itr.next()
  t.deepEquals(d, [0x00, 0x00, 0x01, 0xe0, 0x00, 0x00, 0x00, 0x02], 'got the correct bytes')

  t.notOk(itr.next(), 'did not get a next segment because we are at the end')

  t.end()
})

// test.only('that we can parse audio packets from program stream', t=> {
//
//   const bufferA       = Uint8Array.from(ts)
//   let transportStream = TransportStream.parse(bufferA)
//
//   let ves             = ElementaryStream.parse(transportStream, 27, 1)
//   let aes              = ElementaryStream.parse(transportStream, 15, 2)
//
//   AccessUnit.parse(ves)
//   ADTS.parse(aes)
//   // console.log(transportStream.packets[0]);
//   // console.log(es.packets[0]);
//
//   t.end()
// })
