const test  = require('tape')
const fs    = require('fs')
import TransportStream from '../src/parsers/container/ts/transport-stream'
import TransportStreamParser from '../src/parsers/container/ts/parser'
import ElementaryStream from '../src/parsers/container/ts/elementary-stream'
import PESPacket from '../src/parsers/container/ts/pes-packet'
import { buildRBSP } from '../src/parsers/container/ts/nalu'
import * as bytes from '../src/helpers/byte-helpers'


const ts = fs.readFileSync('./tests/fixtures/fileSequence0.ts')
// const tsB = fs.readFileSync('./tests/fixtures/segment.ts')

test('we can parse ts files', t=> {

  let byteArray = new Uint8Array(ts)
  const stream = TransportStream.parse(byteArray)
  t.equals(stream.packets.length, 1551, 'got correct amount of packets')

  const uniqueLength = unique(stream.packets.map(p => p.length))
  t.equals(1, uniqueLength.length, 'all packets had the same size')
  t.equals(188, uniqueLength[0], 'they were all 188 bytes')

  const syncBytes = unique(stream.packets.map(p => p.header.syncByte))
  t.equals(1, syncBytes.length, 'all packets had the same sync byte')
  t.equals(0x47, syncBytes[0], 'they were all genuine sync bytes')

  const pat = stream.packets[0]

  t.equals('PAT', pat.constructor.name,       'Got a program access table packet')
  t.equals(1, pat.programs.length,            'got correct amount of programs')
  t.equals(1, pat.programs[0].programNumber,  'got correct program number')
  t.equals(256, pat.programs[0].mapID,        'got correct pmt id')
  t.equals(256, pat.pmtID,                    'computed property for default pmt id works')
  t.ok(pat.crc,                               'crc was present')

  const pmt = stream.packets[1]
  t.equals('PMT', pmt.constructor.name,   'Got a program map table')
  t.ok(pmt.programs,                      'programs were present')
  t.equals(1, pmt.programs.length,        'got correct number of programs')
  t.equals(257,   pmt.programs[0].pcrPID, 'clock pid was present')

  t.ok(pmt.programs[0].tracks, 'tracks were present')
  t.equals(2, pmt.programs[0].tracks.length, 'correct amount of tracks present')

  const trackA = pmt.programs[0].tracks[0]
  t.ok(trackA, 'track present')
  t.equals(27, trackA.streamType,     'marked as a video track')
  t.equals(257, trackA.elementaryPID, 'es pid present')

  const trackB = pmt.programs[0].tracks[1]
  t.ok(trackB, 'track present')
  t.equals(15, trackB.streamType,       'marked as an audio track')
  t.equals(258, trackB.elementaryPID,   'es pid present')

  const mediaPacket = stream.packets[2]
  t.equals('MediaPacket', mediaPacket.constructor.name, 'got a media packet')
  t.ok(mediaPacket.streamType, 'stream type was present')

  t.end()
})

test('that we can parse pcr info from video packets', t=> {

  let byteArray = new Uint8Array(ts)
  const stream  = TransportStream.parse(byteArray)

  let videoPackets = stream.packets.filter(p => p.header.PID === 257).filter(p => p.header.adaptationField !== undefined)
  videoPackets     = videoPackets.filter(p => p.header.adaptationField.pcrBase !== undefined )

  ///// Check video packets first
  const packet = videoPackets[0]
  t.equals(27, packet.streamType, 'got a video packet')

  const header = packet.header
  t.ok(packet.header, 'packet had a header')
  t.ok(packet.header.adaptationField, 'adaptation field was present')

  const adaptationField = header.adaptationField
  t.ok(adaptationField.pcrBase,   'pcrBase was present (video)')
  t.ok(adaptationField.pcrConst,  'pcrConst was present')
  t.ok(adaptationField.pcrExt,    'pcrExt was present')

  t.end()
})

test('that we can parse a rbsp (stripping emulating bytes)', t=> {

  const sps = [103, 66, 192, 30, 182, 129, 161, 255, 147, 1, 16,
                 0,  0, 3,
                 0, 16, 0, 0, 3,
                 3, 206, 40, 0, 117, 48, 3, 169, 230, 162, 0, 248, 177, 117, 0 ]

  let result = buildRBSP(sps)

  let expected = [103, 66, 192, 30, 182, 129, 161, 255, 147,
                  1, 16, 0, 0, 0, 16, 0, 0, 3, 206, 40, 0, 117, 48, 3, 169, 230, 162, 0, 248, 177, 117, 0]

  t.deepEquals(expected, result, 'correctly stripped the rbsp')

  console.log(bytes.parseSPS(result));

  t.end()
})

test.skip('parsing weird stream', t=> {
  const buffer = Uint8Array.from(tsB)
  let transportStream = TransportStream.parse(buffer)

  const codecs       = transportStream.codecs
  t.deepEquals(['avc1.4D001F', 'mp4a.40.2'], codecs, 'codec info was correct')
  const codecsString = transportStream.codecsString
  t.equals('video/mp4; codecs="avc1.4D001F,mp4a.40.2"', transportStream.codecsString, 'codec string was correct')

  t.end()
})

test.skip('that we can parse a stream correctly', t=> {

  const bufferA       = Uint8Array.from(ts)
  let transportStream = TransportStream.parse(bufferA)
  const pmt           = transportStream.packets.filter(p => p.constructor.name === 'PMT')[0]
  const track         = pmt.tracks.filter(t => t.streamType === 27)[0]
  const streamPackets = transportStream.packets.filter(p => p.header.PID === track.elementaryPID)


  let itr = bytes.elementaryStreamIterator(streamPackets, [0, 0, 1, 0xe0], true)
  let cnt = 0
  let pkts = []
  while(1) {
    let next = itr.next()
    if (next) {

      let b = new bytes.BitReader(next.slice(4))
      let p = new PESPacket(0xe0, b, cnt)
      pkts.push(p)
      cnt += 1

    } else {
      break
    }
  }

  itr = bytes.elementaryStreamIterator(pkts, [0, 0, 1])
  console.log(itr.next().slice(0, 10).map(n => n.toString(16)))
  let sps = itr.next()
  let pps = itr.next()
  let a = itr.next()
  let b = itr.next()
  let c = itr.next()
  let idr = itr.next()
  let idr2 = itr.next()

  fs.appendFileSync('/tmp/sss.h264', new Buffer([0, 0, 0, 1]))
  fs.appendFileSync('/tmp/sss.h264', new Buffer(sps))
  fs.appendFileSync('/tmp/sss.h264', new Buffer([0, 0, 0, 1]))
  fs.appendFileSync('/tmp/sss.h264', new Buffer(pps))
  fs.appendFileSync('/tmp/sss.h264', new Buffer([0, 0, 0, 1]))
  fs.appendFileSync('/tmp/sss.h264', new Buffer(a))
  fs.appendFileSync('/tmp/sss.h264', new Buffer([0, 0, 0, 1]))
  fs.appendFileSync('/tmp/sss.h264', new Buffer(b))
  fs.appendFileSync('/tmp/sss.h264', new Buffer([0, 0, 0, 1]))
  fs.appendFileSync('/tmp/sss.h264', new Buffer(c))

  fs.appendFileSync('/tmp/sss.h264', new Buffer([0, 0, 0, 1]))
  fs.appendFileSync('/tmp/sss.h264', new Buffer(idr))
  fs.appendFileSync('/tmp/sss.h264', new Buffer([0, 0, 0, 1]))
  fs.appendFileSync('/tmp/sss.h264', new Buffer(idr2))

  t.end()
})


const unique = (arr) => {
  return arr.filter((val, idx, self) => {
    return self.indexOf(val) === idx
  })
}
