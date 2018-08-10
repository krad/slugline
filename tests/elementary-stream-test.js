import * as bytes from '../src/helpers/byte-helpers'
const test = require('tape')
const fs = require('fs')

test.only('that we can parse an elementary stream', t=> {

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


  t.end()
})


test('that we can parse an elementary stream that spans across packets', t=> {

  const stream = [[0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                  [0x42, 0x42, 0x42, 0, 0 ,1, 0x42],
                  [0x43, 0x43, 0x43, 0, 0, 0, 0],
                  [1, 0x44, 0x44, 0x44, 0, 0, 0, 0],
                  [0, 1, 0x45, 0x45, 0x45]]

  let itr = bytes.elementaryStreamIterator(stream)

  let a = itr.next()
  t.ok(a, 'got first segment')
  t.deepEquals(a, [0x42, 0x42, 0x42], 'it was the segment we expected (0x42)')

  let b = itr.next()
  t.ok(b, 'got  next segment')
  t.deepEquals(b, [0x42, 0x43, 0x43, 0x43, 0x00], 'it was the segment we expected (0x43)')

  let c = itr.next()
  t.ok(c, 'got next segment')
  t.deepEquals(c, [0x44, 0x44, 0x44, 0x00, 0x00], 'it was the segment we expected (0x44)')

  let d = itr.next()
  t.ok(d, 'got next segment')
  t.deepEquals(d, [0x45, 0x45, 0x45], 'it was the segment we expected (0x45)')

  t.end()
})
