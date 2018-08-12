import * as bytes from '../src/helpers/byte-helpers'
import * as atoms from '../src/transmuxing/atoms'
import { TransportStream } from '../src/slugline'
import MPEGParser from '../src/parsers/container/mpeg-parser'
import Transmuxer from '../src/transmuxing/transmuxer'
const test = require('tape')
const fs = require('fs')

const tsURL1 = './tests/fixtures/apple-basic-ts/gear1/fileSequence0.ts'
const tsURL2 = './tests/fixtures/apple-basic-ts/gear1/fileSequence1.ts'

const assetA = fs.readFileSync(tsURL1)
const assetB = fs.readFileSync(tsURL2)

const asset2 = fs.readFileSync('./tests/fixtures/master_Layer0_01195.ts')

const initSegmentOut  = '/tmp/ftyp.mp4'
const mediaSegmentOut = '/tmp/moof.mp4'

test('that are byte helpers do what they say they do', t=> {
  const a = bytes.u32(1)
  const b = bytes.u16(1)
  const c = bytes.s16(1)
  const d = bytes.s16(-1)
  const e = bytes.s16(-255)
  const f = bytes.s16(-32768)
  const g = bytes.s16(32767)

  t.deepEqual({0: 0, 1: 0, 2: 0, 3: 1}, a, 'got the correct bytes for a unsigned 32 bit integer')
  t.deepEqual({0: 0, 1: 1}, b, 'got the correct bytes for a unsigned 16 bit integer')
  t.deepEqual({0: 0, 1: 1}, c, 'got correct bytes for a signed 16 bit integer')
  t.deepEqual({0: 255, 1: 255}, d, 'got correct bytes for a signed 16 bit integer')
  t.deepEqual({0: 255, 1: 1}, e, 'got correct bytes for a signed 16 bit integer')
  t.deepEqual({0: 128, 1: 0}, f, 'got correct bytes for a signed 16 bit integer')
  t.deepEqual({0: 127, 1: 255}, g, 'got correct bytes for a signed 16 bit integer')

  let view = new DataView(d.buffer)
  t.equals(-1, view.getInt16(0), 'was able to get the correct value back (-1)')

  view = new DataView(e.buffer)
  t.equals(-255, view.getInt16(0), 'was able to get the correct value back (-255)')

  view = new DataView(f.buffer)
  t.equals(-32768, view.getInt16(0), 'was able to get the correct value back (-32768)')

  view = new DataView(g.buffer)
  t.equals(32767, view.getInt16(0), 'was able to get the correct value back (32767)')

  t.end()
})

test('that we can do exponential golomb encoding/decoding', t=> {
  // Test encoding unsigned numbers
  t.equals('1',       bytes.expGolombEnc(0), '0 ⇒ 1 ⇒ 1')
  t.equals('010',     bytes.expGolombEnc(1), '1 ⇒ 10 ⇒ 010')
  t.equals('011',     bytes.expGolombEnc(2), '2 ⇒ 11 ⇒ 011')
  t.equals('00100',   bytes.expGolombEnc(3), '3 ⇒ 100 ⇒ 00100')
  t.equals('00101',   bytes.expGolombEnc(4), '4 ⇒ 101 ⇒ 00101')
  t.equals('00110',   bytes.expGolombEnc(5), '5 ⇒ 110 ⇒ 00110')
  t.equals('00111',   bytes.expGolombEnc(6), '6 ⇒ 111 ⇒ 00111')
  t.equals('0001000', bytes.expGolombEnc(7), '7 ⇒ 1000 ⇒ 0001000')
  t.equals('0001001', bytes.expGolombEnc(8), '8 ⇒ 1001 ⇒ 0001001')

  // Test encoding signed numbers
  t.equals('011',     bytes.expGolombEnc(-1), '−1 ⇒ 2 ⇒ 11 ⇒ 011')
  t.equals('00101',   bytes.expGolombEnc(-2), '−2 ⇒ 4 ⇒ 101 ⇒ 00101')
  t.equals('00111',   bytes.expGolombEnc(-3), '−3 ⇒ 6 ⇒ 111 ⇒ 00111')
  t.equals('0001001', bytes.expGolombEnc(-4), '−4 ⇒ 8 ⇒ 1001 ⇒ 0001001')


  // Test decoding
  t.equals(0, bytes.expGolobDec('1'),       '1 ⇒ 0')
  t.equals(1, bytes.expGolobDec('010'),     '010 ⇒ 1')
  t.equals(2, bytes.expGolobDec('011'),     '011 ⇒ 2')
  t.equals(3, bytes.expGolobDec('00100'),   '00100 ⇒ 3')
  t.equals(4, bytes.expGolobDec('00101'),   '00101 ⇒ 4')
  t.equals(5, bytes.expGolobDec('00110'),   '00110 ⇒ 5')
  t.equals(6, bytes.expGolobDec('00111'),   '00111 ⇒ 6')
  t.equals(7, bytes.expGolobDec('0001000'), '0001000 ⇒ 7')
  t.equals(8, bytes.expGolobDec('0001001'), '0001001 ⇒ 8')

  t.end()
})

test('that we can parse a sps', t=> {

  const buffer = Uint8Array.from(assetA)
  let ts       = TransportStream.parse(buffer)

  t.ok(ts.tracksConfig[0].sps, 'elementary stream had a parsed sps')
  const sps = ts.tracksConfig[0].sps

  t.equals(77, sps.profileIDC,                 'got profileIDC')
  t.equals(0, sps.constraint_set0_flag,        'got constraint_set0_flag')
  t.equals(1, sps.constraint_set1_flag,        'got constraint_set1_flag')
  t.equals(0, sps.constraint_set2_flag,        'got constraint_set2_flag')
  t.equals(0, sps.constraint_set3_flag,        'got constraint_set3_flag')
  t.equals(0, sps.constraint_set4_flag,        'got constraint_set4_flag')
  t.equals(21, sps.levelIDC,                   'got levelIDC')
  t.equals(400, sps.width,                     'got width')
  t.equals(300, sps.height,                    'got height')
  t.equals(1, sps.vui_parameters_present_flag, 'vui params were signaled as being present')

  console.log(sps);

  t.end()
})

test('that we can create an init segment from a ts file', t=> {

  const buffer = Uint8Array.from(assetA)
  let ts = TransportStream.parse(buffer)
  t.equals(1551, ts.packets.length, '🎬 😃')

  t.ok(ts.tracksConfig,                  'transmuxer had a config object')
  t.equals(2, ts.tracksConfig.length,    'transmuxer had config for both tracks')
  t.equals(27, ts.tracksConfig[0].type,  'correctly identified first track as a video track')
  // t.equals(15, ts.tracksConfig[1].type,  'correctly identified second track as an audio track')
  t.equals(1, ts.tracksConfig[0].id,     'had a track id for video')
  // t.equals(2, ts.tracksConfig[1].id,     'had a track id for audio')
  t.equals(2, ts.tracksConfig[0].codec.length, 'had an array with two entries.  one for sps the other pps')

  let muxer = new Transmuxer()

  // t.equals('ADTS', muxer.config[1].codec.constructor.name, 'had an ADTSFrame for the codec payload')

  let initSegment = muxer.buildInitializationSegment(ts)
  t.ok(initSegment, 'we got an init segment')
  let atomtree = MPEGParser.parse(initSegment)

  t.ok(atomtree.root,                              'got a atom tree with a root')
  t.equals(atomtree.root[0].name,        'ftyp',   'was an ftyp atom')
  t.equals(atomtree.root[0].location,         0,   'atom began at correct location')
  t.equals(atomtree.root[0].size,            32,   'correct size')
  t.equals(atomtree.root[0].majorBrand,  'mp42',   'correct major brand')
  t.equals(atomtree.root[0].minorVersion,     1,   'correct minor version')

  const brands = atomtree.root[0].compatibleBrands
  t.equals(brands.length,  4, 'got correct number of compatibleBrands')
  t.equals(brands[0], 'mp41', 'got mp41 compatible brand')
  t.equals(brands[1], 'mp42', 'got mp42 compatible brand')
  t.equals(brands[2], 'isom', 'got isom compatible brand')
  t.equals(brands[3], 'hlsf', 'got hlsf compatible brand')

  const moov = atomtree.root[1]
  t.ok(moov,                            'we got something at the second atom')
  t.equals(moov.name,           'moov', '-- it was in fact a moov')
  // t.equals(moov.children.length,     4, 'we got children in the moov atom')

  const mvhd = moov.children[0]
  t.equals(mvhd.name, 'mvhd', '--- got a mvhd atom')

  ////
  // const mvex = moov.children[3]
  // t.equals(mvex.name, 'mvex', '--- got a mvex atom')

  // const trex1 = mvex.children[0]
  // t.equals(trex1.name,    'trex', '---- got a trex atom (video)')
  // t.equals(trex1.trackID,      1, '---- - got correct track id')

  ///////////// First trak (video)
  // const trak1 = moov.children[1]
  // t.equals(trak1.name, 'trak', '--- got a trak atom (video)')
  //
  // const tkhd = trak1.children[0]
  // t.equals(tkhd.name, 'tkhd', '---- got a tkhd atom')
  //
  // const mdia1 = trak1.children[1]
  // t.equals(mdia1.name, 'mdia', '---- got a mdia atom')
  //
  // const minf1 = mdia1.children[2]
  // t.equals(minf1.name, 'minf', '----- got a minf atom')
  //
  // const vmhd = minf1.children[0]
  // t.equals(vmhd.name, 'vmhd', '------ got a vmhd atom')
  //
  // const stbl1 = minf1.children[2]
  // t.equals(stbl1.name, 'stbl', '------ got a stbl for the video track')
  //
  // const stsd1 = stbl1.children[0]
  // t.equals(stsd1.name, 'stsd', '------- got a stsd for the video track')
  //
  // const avc1 = stsd1.children[0]
  // t.equals(avc1.name, 'avc1', '-------- got a avc1 atom')
  // t.equals(avc1.width,   400, '-------- - got correct width')
  // t.equals(avc1.height,  300, '-------- - got correct height')
  //
  //
  // const avcC = avc1.children[0]
  // t.equals(avcC.name, 'avcC', '--------- got a avcC atom')
  //
  // const sps = muxer.config[0].codec[0].nalu
  // t.equals(avcC.profile,              sps[1], '--------- - profile matched muxer config')
  // t.equals(avcC.profileCompatibility, sps[2], '--------- - profile compatibility matched muxer config')
  // t.equals(avcC.levelIndication,      sps[3], '--------- - level indication matched config')
  //
  // ///////////// Second trak (audio)
  // const trex2 = mvex.children[1]
  // t.equals(trex2.name,    'trex', '---- got a trex atom (audio)')
  // t.equals(trex2.trackID,      2, '---- got correct track id')
  //
  // const trak2 = moov.children[2]
  // t.equals(trak2.name, 'trak', '--- got a trak atom (audio)')

  // console.log(trak2);

  //
  // const mdhd = mdia.children[0]
  // t.equals(mdhd.name, 'mdhd', 'got a mdhd atom')
  // //
  // const hdlr = mdia.children[1]
  // t.equals(hdlr.name, 'hdlr', 'got a hdlr atom')
  // //
  // const minf = mdia.children[2]
  // t.equals(minf.name, 'minf', 'got a minf atom')
  // //
  // const vmhd = minf.children[0]
  // t.equals(vmhd.name, 'vmhd', 'got a vmhd atom')
  //
  // const smhd = minf.children[1]
  // t.equals(smhd.name, 'smhd', 'got a smhd atom')
  //
  // const dinf = minf.children[2]
  // t.equals(dinf.name, 'dinf', 'got a dinf atom')
  //
  // const dref = dinf.children[0]
  // t.equals(dref.name, 'dref', 'got a dref atom')
  //
  // const stbl = minf.children[3]
  // t.equals(stbl.name, 'stbl', 'got a stbl atom')
  //
  // const stsd = stbl.children[0]
  // t.equals(stsd.name, 'stsd', 'got a stsd atom')
  //
  // const stts = stbl.children[1]
  // t.equals(stts.name, 'stts', 'got a stts atom')
  //
  // const stsc = stbl.children[2]
  // t.equals(stsc.name, 'stsc', 'got a stsc atom')
  //
  // const stsz = stbl.children[3]
  // t.equals(stsz.name, 'stsz', 'got a stsz atom')
  //
  // const stco = stbl.children[4]
  // t.equals(stco.name, 'stco', 'got a stco atom')
  //
  fs.appendFileSync(initSegmentOut, new Buffer(initSegment))

  t.end()
})

test('that we can build an media fragment', t=> {
  const bufferA  = Uint8Array.from(assetA)
  const bufferB  = Uint8Array.from(assetB)

  let tsA        = TransportStream.parse(bufferA)
  let tsB        = TransportStream.parse(bufferB)

  let muxer      = new Transmuxer()
  t.equals(muxer.decodeCount,          0, 'decode count started at zero')
  t.equals(muxer.currentOffset,        0, 'current offset started at zero')
  t.equals(muxer.currentMediaSequence, 1, 'current media sequence started at one')

  let sequences = muxer.buildSequences(tsA, 27)
  t.ok(sequences, 'got a result back')
  t.equals(sequences.length, 12, 'got correct amount of sequences')

  const seq1 = sequences[0]
  t.equals(1, seq1.trackID, 'sequence had a track id')
  t.equals(27, seq1.streamType, 'sequence had a streamType')
  t.equals(seq1.currentMediaSequence, 1, 'media sequence was 1 for first sequence')
  t.ok(seq1.offset, 'had a starting offset')

  const seq2 = sequences[1]
  t.equals(1, seq2.trackID, 'sequence had a track id')
  t.equals(27, seq2.streamType, 'sequence had a streamType')
  t.equals(seq2.currentMediaSequence, 2, 'media sequence was 2 for second sequence')
  t.ok(seq2.offset, 'had a starting offset')

  t.ok(seq1.offset < seq2.offset, 'offset is increasing')

  t.ok(seq1.payload, 'sequence 1 had a payload')
  t.equals(seq1.payload.length, 43, 'had correct amount of entries in the payload')

  t.ok(seq2.payload, 'sequence 2 had a payload')
  t.equals(seq2.payload.length, 47, 'had correct amount of entries in the payload')

  const frameA = seq1.payload[0]
  t.ok(frameA.nalu,     'first frame had a nalu payload')
  t.ok(frameA.pcrBase,  'first frame had a pcrBase')
  t.equals(5, frameA.nalu[0] & 0x1f, 'first frame was an IDR')

  const frameB = seq2.payload[0]
  t.ok(frameB.nalu,     'second frame had a nalu payload')
  t.ok(frameB.pcrBase,  'second frame had a pcrBase')
  t.equals(5, frameB.nalu[0] & 0x1f, 'second frame was an IDR')

  /////////////////////////
  // Build and actual payload now
  muxer         = new Transmuxer()
  const payload = muxer.buildMediaSegment(tsA)
  fs.appendFileSync(mediaSegmentOut, new Buffer(payload))

  t.end()
})

test.only('writing a segment', t=> {
  const bufferA  = Uint8Array.from(asset2)
  let tsA        = TransportStream.parse(bufferA)
  let muxer     = new Transmuxer()

  muxer.setCurrentStream(tsA)

  const init    = muxer.buildInitializationSegment()
  const payload = muxer.buildMediaSegment()

  fs.appendFileSync('/tmp/chunk.mp4', new Buffer(init))
  fs.appendFileSync('/tmp/chunk.mp4', new Buffer(payload))

  t.end()
})

test('binary pts helper thing', t=> {

  let high = 28215
  let mid  = 22222
  let low  = 2

  let z = 0
  let pts = 0
  z = (z << 14) | mid
  z = (z << 14) | high

  pts = (pts << 3) | low
  pts = (pts << 15) | mid
  pts = ((pts << 15) | high) >>> 0

  console.log(low.toString(2))
  console.log(' ', mid.toString(2))
  console.log('                ', high.toString(2))

  console.log(pts.toString(2))
  console.log(pts)

  t.end()
})
