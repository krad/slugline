const test  = require('tape')
const fs    = require('fs')
import TransportStream from '../src/parsers/container/ts/transport-stream'
import ElementaryStream from '../src/parsers/container/ts/elementary-stream'
import base64ArrayBuffer from '../src/parsers/container/ts/base64'
import * as bytes from '../src/helpers/byte-helpers'


const ts = fs.readFileSync('./tests/fixtures/fileSequence0.ts')
const tsB = fs.readFileSync('./tests/fixtures/master_Layer0_01195.ts')


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
  t.equals('PMT', pmt.constructor.name, 'Got a program map table')
  t.equals(257,   pmt.pcrPID,           'clock pid was present')
  t.ok(pmt.tracks,                      'tracks were present')
  t.equals(2, pmt.tableID,              'table id was correct')
  t.equals(1, pmt.sectionSyntaxIndicator, 'section syntax indicator was correct')

  // console.log(pmt);

  const trackA = pmt.tracks[0]
  t.ok(trackA, 'track present')
  t.equals(27, trackA.streamType,     'marked as a video track')
  t.equals(257, trackA.elementaryPID, 'es pid present')

  const trackB = pmt.tracks[1]
  t.ok(trackB, 'track present')
  t.equals(15, trackB.streamType,       'marked as an audio track')
  t.equals(258, trackB.elementaryPID,   'es pid present')

  const mediaPacket = stream.packets[2]
  t.equals('MediaPacket', mediaPacket.constructor.name, 'got a media packet')
  t.ok(mediaPacket.streamType, 'stream type was present')

  t.end()
})

test('building an elementary stream out of a bunch of packets', t=> {

  let byteArray = new Uint8Array(ts)
  const stream  = TransportStream.parse(byteArray)
  t.equals(stream.packets.length, 1551, 'got correct amount of packets')

  let elementaryStream = ElementaryStream.parse(stream, 27)
  t.ok(elementaryStream, 'got an elementary stream back')
  t.equals(elementaryStream.chunks.length, 1499, 'got correct amount of video chunks')

  t.equals(elementaryStream.chunks[2].nalu[0] & 0x1f, 7, 'got a SPS nalu')
  t.equals(elementaryStream.chunks[3].nalu[0] & 0x1f, 8, 'got a PPS nalu')
  t.equals(elementaryStream.chunks[4].nalu[0] & 0x1f, 6, 'got a SEI nalu')
  t.equals(elementaryStream.chunks[7].nalu[0] & 0x1f, 5, 'got a IDR nalu')

  t.end()
})

test('parsing config from a transport stream', t=> {
  let byteArray = new Uint8Array(ts)
  const trs      = TransportStream.parse(byteArray)

  t.ok(trs,      'got a transportStream')
  t.ok(trs.PMT,  'transport stream had a program map table')
  t.equals('PMT', trs.PMT.constructor.name, 'was a PMT object')

  t.ok(trs.tracks,                       'transport stream had tracks')
  t.equals(2, trs.tracks.length,         'transport stream had two tracks')
  t.equals(27, trs.tracks[0].streamType, 'first track was a video track')
  t.equals(15, trs.tracks[1].streamType, 'second track was an audio track')

  const config = trs.tracksConfig
  t.ok(config, 'got a config for using with a tree builder')
  t.equals(config.length, 2, 'got right amount of tracks per config')
  t.equals(1, config[0].id, 'got the right track id')
  t.equals(27, config[0].type, 'got the correct track type')
  t.equals(2, config[0].codec.length, 'got correct codec info')
  t.ok(config[0].sps, 'video track had a parsed sps')
  t.equals(config[0].sps.width, 400, 'had the correct width in the sps')
  t.equals(config[0].sps.height, 300, 'had the correct height in the sps')


  t.equals(2,    config[1].id,  'got the right track id')
  t.equals(15, config[1].type,  'got the correct track type')
  t.equals('ADTS', config[1].codec.constructor.name, 'got the correct type of codec thingie for the audio track')
  console.log(config);

  t.end()
})

test('parsing audio packets from a transport stream', t=> {
  let byteArray = new Uint8Array(ts)
  const stream  = TransportStream.parse(byteArray)

  let es = ElementaryStream.parse(stream, 15)
  t.ok(es, 'got an elementary stream')
  t.equals(es.chunks.length, 161, 'got correct amount of audio chunks')

  let sampleFreq = unique(es.chunks.map(c => c.samplingFreq))
  t.equals(sampleFreq.length, 1, 'all chunks had the same sampling frequency')

  t.end()
})

test('that we can parse timestamps from pcr info', t=> {

  let byteArray = new Uint8Array(ts)
  const stream  = TransportStream.parse(byteArray)

  let videoPackets = stream.packets.filter(p => p.header.PID === 257).filter(p => p.header.adaptationField !== undefined)
  videoPackets = videoPackets.filter(p => p.header.adaptationField.pcrBase !== undefined )

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

  let x = videoPackets.reduce((acc, curr) => {
    return acc + ((curr.header.adaptationField.pcrBase >> 9) / 90000)
  }, 0)

  console.log(x);

  t.end()
})

test.only('that we can parse a stream correctly', t=> {

  const bufferA  = Uint8Array.from(ts)
  let tsA        = TransportStream.parse(bufferA)
  let es         = ElementaryStream.parse(tsA, 27, 1)

  let au = es.chunks[0]
  t.ok(au)

  // let sps = au.nalus[1]
  // let pps = au.nalus[2]
  // let idr = au.nalus[5]
  //
  //
  es.chunks.forEach(au => {
    let n = au.nalus[0]
    let r = new bytes.BitReader(n.nalu)
    r.readBit()
    r.readBits(2)
    r.readBits(5)
    console.log(r.readBits(3));
  })


  // console.log(au.duration);
  // console.log(au);
  // let blah = au.nalus[0]
  // let sps  = au.nalus[1]
  // let pps  = au.nalus[2]
  // let sei  = au.nalus[5]
  // let idrA = au.nalus[6]
  // let idrB = au.nalus[7]
  //
  // let x = new bytes.BitReader(blah.nalu)
  // console.log(x.readBit());
  // console.log(x.readBits(2));
  // console.log(x.readBits(5));
  // console.log(x.readBits(3));
  //
  // let a = new bytes.BitReader(idrA.nalu)
  // let b = new bytes.BitReader(idrB.nalu)
  // console.log('-----');
  // console.log('id', au.id);
  // console.log('forbidden:', a.readBit());
  // console.log('ref_idc:', a.readBits(2));
  // console.log('type:', a.readBits(5));
  // console.log(idrA.nalu.slice(0, 10));
  // console.log(idrA.nalu.length);
  //
  // console.log('-----');
  // console.log('id', au.id);
  // console.log('forbidden:', b.readBit());
  // console.log('ref_idc:', b.readBits(2));
  // console.log('type:', b.readBits(5));
  // console.log(idrB.nalu.slice(0, 10));
  // console.log(idrB.nalu.length);
  //
  //
  // fs.appendFileSync('/tmp/sss.h264', new Buffer([0, 0, 0, 1]))
  // fs.appendFileSync('/tmp/sss.h264', new Buffer(blah.nalu))
  // fs.appendFileSync('/tmp/sss.h264', new Buffer([0, 0, 0, 1]))
  // fs.appendFileSync('/tmp/sss.h264', new Buffer(sps.nalu))
  // fs.appendFileSync('/tmp/sss.h264', new Buffer([0, 0, 0, 1]))
  // fs.appendFileSync('/tmp/sss.h264', new Buffer(pps.nalu))
  // fs.appendFileSync('/tmp/sss.h264', new Buffer([0, 0, 0, 1]))
  // fs.appendFileSync('/tmp/sss.h264', new Buffer(sei.nalu))
  // fs.appendFileSync('/tmp/sss.h264', new Buffer([0, 0, 0, 1]))
  // fs.appendFileSync('/tmp/sss.h264', new Buffer(idrA.nalu))
  // fs.appendFileSync('/tmp/sss.h264', new Buffer([0, 0, 0, 1]))
  // fs.appendFileSync('/tmp/sss.h264', new Buffer(idrB.nalu))
  //
  // fs.appendFileSync('/tmp/sss.h264', new Buffer(idrA.nalu))
  // fs.appendFileSync('/tmp/sss.h264', new Buffer(idrA.nalu))


  // fs.appendFileSync('/tmp/sss.h264', new Buffer(idrA.nalu))
  // fs.appendFileSync('/tmp/sss.h264', new Buffer([0, 0, 0, 1]))
  // fs.appendFileSync('/tmp/sss.h264', new Buffer(idrB.nalu))
  //

  // fs.appendFileSync('/tmp/ss.h264', new Buffer(other.nalu))
  // fs.appendFileSync('/tmp/chunk.mp4', new Buffer(init))
  // fs.appendFileSync('/tmp/chunk.mp4', new Buffer(payload))


  // let rbsp = []
  // for (var i = 0; i < other.nalu.length; i++) {
  //   // console.log(b.readBits(24));
  //   // if (i+2 < other.nalu.length && b.readBits(24) === 0x000003) {
  //   //   b.rewind(24)
  //   //   rbsp.push(b.readBits(8))
  //   //   rbsp.push(b.readBit(8))
  //   //   i += 2
  //   //   console.log(b.readBit(8));
  //   // } else {
  //   //   rbsp.push(b.readBit(8))
  //   // }
  // }
  // console.log("RBSP:", rbsp.length, "NALU:", other.nalu.length);
  // for (var i = 0; i <50*10; i+=10) {
  //   console.log(other.nalu.slice(i, i+10));
  // }

  t.end()
})


const unique = (arr) => {
  return arr.filter((val, idx, self) => {
    return self.indexOf(val) === idx
  })
}
