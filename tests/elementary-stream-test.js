import * as bytes from '../src/helpers/byte-helpers'
const test = require('tape')
const fs = require('fs')

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
  t.deepEquals(c, [0x44, 0x44, 0x44], 'it was the segment we expected (0x44)')

  let d = itr.next()
  t.ok(d, 'got next segment')
  t.deepEquals(d, [0x45, 0x45, 0x45], 'it was the segment we expected (0x45)')

  t.notOk(itr.next(), 'got undefined at the end of stream')

  t.end()
})


test('that we can parse an elementary stream that spans across packets', t=> {

  const stream = [[0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0x88, 0x99],
                  [0x42, 0x42, 0x42, 0, 0 ,1, 0x42],
                  [0x43, 0x43, 0x43, 0, 0, 0, 0],
                  [1, 0x44, 0x44, 0x44, 0, 0, 0, 0],
                  [0, 1, 0x45, 0x45, 0x45]]

  let itr = bytes.elementaryStreamIterator(stream)

  let a = itr.next()
  t.ok(a, 'got first segment')
  t.deepEquals(a, [0x88, 0x99, 0x42, 0x42, 0x42], 'it was the segment we expected (0x42)')

  let b = itr.next()
  t.ok(b, 'got  next segment')
  t.deepEquals(b, [0x42, 0x43, 0x43, 0x43, 0x00], 'it was the segment we expected (0x43)')

  let c = itr.next()
  t.ok(c, 'got next segment')
  t.deepEquals(c, [0x44, 0x44, 0x44, 0x00, 0x00], 'it was the segment we expected (0x44)')

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
                  [0x45, 0x45, 0xe0, 0, 0, 0 ,1, 0xe0, 0, 0, 0, 2]]

  let itr = bytes.elementaryStreamIterator(stream, 0xe0)

  let a = itr.next()
  t.ok(a, 'got a chunk back')
  t.deepEquals(a, [66, 66, 66, 66, 0, 0, 0, 0, 1, 67, 67, 67, 67], 'got first packet')

  let b = itr.next()
  t.ok(b, 'got the next chunk')
  t.deepEquals(b, [0x44, 0x44, 0x44, 0x44, 0x00], 'got the next packet')

  let c = itr.next()
  t.ok(c, 'got the next chunk')
  t.deepEquals(c, [0x45, 0x45, 0x45, 0x45, 0xe0], 'got the correct bytes')

  let d = itr.next()
  t.deepEquals(d, [0x00, 0x00, 0x00, 0x02], 'got the correct bytes')

  t.notOk(itr.next(), 'did not get a next segment because we are at the end')

  t.end()
})
