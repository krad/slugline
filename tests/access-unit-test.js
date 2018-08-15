const test = require('tape')
const fs   = require('fs')

import TransportStream from '../src/parsers/container/ts/transport-stream'
import ElementaryStream from '../src/parsers/container/ts/elementary-stream'
import AccessUnit, { keyframeIterator } from '../src/parsers/container/ts/access-unit'
import * as bytes from '../src/helpers/byte-helpers'

const segment = fs.readFileSync('./tests/fixtures/fileSequence0.ts')
// const ts2 = fs.readFileSync('./tests/fixtures/master_Layer0_01195.ts')

test('that we can build a list of video access units', t=> {
  let byteArray   = new Uint8Array(segment)
  const ts        = TransportStream.parse(byteArray)
  const videoPES  = ElementaryStream.parse(ts, 27, 1)

  const result = AccessUnit.parse(videoPES)
  t.ok(result, 'got a result back')

  t.ok(result.units, 'had a list of access units')
  t.ok(result.sps, 'sps was present')
  t.equals('NALU', result.sps.constructor.name, 'was a nalu struct')
  t.ok(result.pps, 'pps was present')
  t.equals('NALU', result.pps.constructor.name, 'was a nalu struct')
  t.ok(result.spsParsed, 'parsed version of the sps was also available')

  const au = result.units[0]
  t.equals('AccessUnit', au.constructor.name, 'first entry was an access unit')
  t.ok(au.packet, 'access unit had associated packet')
  t.ok(au.dts,    'access unit had a dts')
  t.ok(au.pts,    'access unit had a pts')

  t.equals(true, au.isKeyFrame, 'access unit was marked as a keyframe')
  t.equals(true, au.hasConfig,  'access unit was marked as having sps/pps info')

  t.ok(au.nalus,   'access unit had nalus')

  t.end()
})


test('that we can chunk access units by idrs', t=> {

  let byteArray   = new Uint8Array(segment)
  const ts        = TransportStream.parse(byteArray)
  const videoPES  = ElementaryStream.parse(ts, 27, 1)

  const result = AccessUnit.parse(videoPES)
  t.ok(result, 'got a result back')

  let itr = keyframeIterator(result.units)
  let next = itr.next()
  t.ok(next, 'got a result back')
  t.equals(24, next.length)
  t.equals(0, next[0].id, 'access unit id was correct')
  t.equals(true, next[0].isKeyFrame, 'first entry was a keyframe')

  t.equals(23, next.slice(-1)[0].id, 'last entry had correct id')
  t.equals(false, next.slice(-1)[0].isKeyFrame, 'last entry was not a keyframe')

  next = itr.next()
  t.equals(24, next.length)
  t.equals(24, next[0].id, 'next entry started with correct id')
  t.equals(true, next[0].isKeyFrame, 'first entry was a keyframe in the next packet')
  t.equals(47, next.slice(-1)[0].id, 'last au had the correct id')
  t.equals(false, next.slice(-1)[0].isKeyFrame, 'last entry was not a keyframe')

  next = itr.next()
  t.equals(24, next.length)
  t.equals(48, next[0].id, 'next entry started with correct id')
  t.equals(true, next[0].isKeyFrame, 'first entry was a keyframe in the next packet')
  t.equals(71, next.slice(-1)[0].id, 'last au had the correct id')
  t.equals(false, next.slice(-1)[0].isKeyFrame, 'last entry was not a keyframe')

  next = itr.next()
  t.equals(24, next.length)
  t.ok(next, 'got the next group')
  t.equals(72, next[0].id, 'next entry started with correct id')
  t.equals(true, next[0].isKeyFrame, 'first entry was a keyframe in the next packet')
  t.equals(95, next.slice(-1)[0].id, 'last au had the correct id')
  t.equals(false, next.slice(-1)[0].isKeyFrame, 'last entry was not a keyframe')

  next = itr.next()
  t.equals(24, next.length)
  t.ok(next, 'got the next group')
  t.equals(96, next[0].id, 'next entry started with correct id')
  t.equals(true, next[0].isKeyFrame, 'first entry was a keyframe in the next packet')
  t.equals(119, next.slice(-1)[0].id, 'last au had the correct id')
  t.equals(false, next.slice(-1)[0].isKeyFrame, 'last entry was not a keyframe')

  next = itr.next()
  t.equals(24, next.length)
  t.ok(next, 'got the next group')
  t.equals(120, next[0].id, 'next entry started with correct id')
  t.equals(true, next[0].isKeyFrame, 'first entry was a keyframe in the next packet')
  t.equals(143, next.slice(-1)[0].id, 'last au had the correct id')
  t.equals(false, next.slice(-1)[0].isKeyFrame, 'last entry was not a keyframe')

  next = itr.next()
  t.equals(24, next.length)
  t.ok(next, 'got the next group')
  t.equals(144, next[0].id, 'next entry started with correct id')
  t.equals(true, next[0].isKeyFrame, 'first entry was a keyframe in the next packet')
  t.equals(167, next.slice(-1)[0].id, 'last au had the correct id')
  t.equals(false, next.slice(-1)[0].isKeyFrame, 'last entry was not a keyframe')

  next = itr.next()
  t.equals(24, next.length)
  t.ok(next, 'got the next group')
  t.equals(168, next[0].id, 'next entry started with correct id')
  t.equals(true, next[0].isKeyFrame, 'first entry was a keyframe in the next packet')
  t.equals(191, next.slice(-1)[0].id, 'last au had the correct id')
  t.equals(false, next.slice(-1)[0].isKeyFrame, 'last entry was not a keyframe')

  next = itr.next()
  t.equals(24, next.length)
  t.ok(next, 'got the next group')
  t.equals(192, next[0].id, 'next entry started with correct id')
  t.equals(true, next[0].isKeyFrame, 'first entry was a keyframe in the next packet')
  t.equals(215, next.slice(-1)[0].id, 'last au had the correct id')
  t.equals(false, next.slice(-1)[0].isKeyFrame, 'last entry was not a keyframe')

  next = itr.next()
  t.equals(24, next.length)
  t.ok(next, 'got the next group')
  t.equals(216, next[0].id, 'next entry started with correct id')
  t.equals(true, next[0].isKeyFrame, 'first entry was a keyframe in the next packet')
  t.equals(239, next.slice(-1)[0].id, 'last au had the correct id')
  t.equals(false, next.slice(-1)[0].isKeyFrame, 'last entry was not a keyframe')

  next = itr.next()
  t.equals(24, next.length)
  t.ok(next, 'got the next group')
  t.equals(240, next[0].id, 'next entry started with correct id')
  t.equals(true, next[0].isKeyFrame, 'first entry was a keyframe in the next packet')
  t.equals(263, next.slice(-1)[0].id, 'last au had the correct id')
  t.equals(false, next.slice(-1)[0].isKeyFrame, 'last entry was not a keyframe')

  next = itr.next()
  t.equals(24, next.length)
  t.ok(next, 'got the next group')
  t.equals(264, next[0].id, 'next entry started with correct id')
  t.equals(true, next[0].isKeyFrame, 'first entry was a keyframe in the next packet')
  t.equals(287, next.slice(-1)[0].id, 'last au had the correct id')
  t.equals(false, next.slice(-1)[0].isKeyFrame, 'last entry was not a keyframe')

  next = itr.next()
  t.equals(11, next.length)
  t.ok(next, 'got the next group')
  t.equals(288, next[0].id, 'next entry started with correct id')
  t.equals(true, next[0].isKeyFrame, 'first entry was a keyframe in the next packet')
  t.equals(298, next.slice(-1)[0].id, 'last au had the correct id')
  t.equals(false, next.slice(-1)[0].isKeyFrame, 'last entry was not a keyframe')

  next = itr.next()
  t.notOk(next, 'ran out of things to iterate')

  t.end()
})
