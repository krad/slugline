const test = require('tape')
const fs   = require('fs')

import TransportStream from '../src/parsers/container/ts/transport-stream'
import ElementaryStream from '../src/parsers/container/ts/elementary-stream'
import AccessUnit from '../src/parsers/container/ts/access-unit'
import * as bytes from '../src/helpers/byte-helpers'

const segment = fs.readFileSync('./tests/fixtures/fileSequence0.ts')

test('that we can build a list of video access units', t=> {
  let byteArray   = new Uint8Array(segment)
  const ts        = TransportStream.parse(byteArray)
  const videoPES  = ElementaryStream.parse(ts, 27, 1)

  const result = AccessUnit.parse(videoPES)
  t.ok(result, 'got a result back')

  t.ok(result.units, 'had a list of access units')
  t.equals(298, result.units.length, 'looks like the correct amount')
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
  t.equals(8, au.nalus.length, 'the correct amount of nalus')

  t.end()
})
