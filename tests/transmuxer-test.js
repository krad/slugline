import * as bytes from '../src/transmuxing/byte-helpers'
import * as atoms from '../src/transmuxing/atoms'
import { TransportStream } from '../src/slugline'
import MPEGParser from '../src/parsers/container/mpeg-parser'
import Transmuxer from '../src/transmuxing/transmuxer'
const test = require('tape')
const fs = require('fs')

const tsURL = './tests/fixtures/apple-basic-ts/gear1/fileSequence0.ts'
const asset = fs.readFileSync(tsURL)

const out = '/tmp/ftyp.mp4'

test('that are byte helpers do what they say they do', t=> {

  const a = bytes.u32(1)
  const b = bytes.u16(1)
  const c = bytes.s16(1)
  const d = bytes.s16(-1)

  t.deepEqual({0: 0, 1: 0, 2: 0, 3: 1}, a, 'got the correct bytes for a unsigned 32 bit integer')
  t.deepEqual({0: 0, 1: 1}, b, 'got the correct bytes for a unsigned 16 bit integer')
  t.deepEqual({0: 0, 1: 1}, c, 'got correct bytes for a signed 16 bit integer')
  t.deepEqual({0: 255, 1: 255}, d, 'got correct bytes for a signed 16 bit integer')

  let view = new DataView(d.buffer)
  t.equals(-1, view.getInt16(0), 'was able to get the correct value back')

  t.end()
})

test('that we can "build" an atom', t=> {

  ////// Let's start simple.  Ensure that the ftyp atom can be built
  const ftyp = atoms.ftyp()
  t.equals(7, ftyp.length, 'got correct amount of byte sequenes')

  let result = atoms.prepare(ftyp)
  t.equals(8, result.length, 'got the byte sequences with prepended header')

  result = atoms.build(ftyp)
  let view = new DataView(result.buffer)
  t.equals('Uint8Array', result.constructor.name, 'got a single uint8 array back')
  t.equals(32, view.getUint32(0), 'got correct size of the ftyp atom')

  /// Now make sure we can correctly size atoms that contain atoms
  const mvex    = atoms.mvex()
  t.equals(2, mvex.length,       'there are 2 entries by default.  mvex label and trex child atom')
  t.equals(1, mvex[1].length,    'child atom is an array contained in another array')
  t.equals(8, mvex[1][0].length, 'trex atom has 8 entries (does not include size yet)')

  result  = atoms.prepare(mvex)
  t.equals(11, result.length, 'structure has the mvex and trex entries as arrays now')

  result  = atoms.build(mvex)
  view    = new DataView(result.buffer)
  t.equals(44, view.getUint32(0), 'got the correct size of the mvex atom')
  t.equals('mvex', bytes.bufferToStr(result.slice(4, 8)), 'got correct atom identifier (mvex)')
  t.equals(36, view.getUint32(8), 'got the correct size of the trex atom')

  t.end()
})

test.only('that we can create an init segment from a ts file', t=> {

  const buffer = Uint8Array.from(asset)
  let ts = TransportStream.parse(buffer)
  t.equals(1551, ts.packets.length, '😃')

  let muxer = new Transmuxer(ts)
  t.ok(muxer.config,                  'transmuxer had a config object')
  t.equals(2, muxer.config.length,    'transmuxer had config for both tracks')
  t.equals(27, muxer.config[0].type,  'correctly identified first track as a video track')
  t.equals(15, muxer.config[1].type,  'correctly identified second track as an audio track')
  t.equals(1, muxer.config[0].id,     'had a track id for video')
  t.equals(2, muxer.config[1].id,     'had a track id for audio')
  t.equals(2, muxer.config[0].codec.length, 'had an array with two entries.  one for sps the other pps')

  /// TODO: Think about this.  May want to yank this out into a more convienent structure
  t.equals('ADTSFrame', muxer.config[1].codec.constructor.name, 'had an ADTSFrame for the codec payload')

  let initSegment = muxer.buildInitializationSegment()
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
  t.equals(moov.name,           'moov', 'it was in fact a moov')
  t.equals(moov.children.length,     4, 'we got children in the moov atom')

  const mvhd = moov.children[0]
  t.equals(mvhd.name, 'mvhd', 'got a mvhd atom')

  ////
  const mvex = moov.children[3]
  t.equals(mvex.name, 'mvex', 'got a mvex atom')

  const trex1 = mvex.children[0]
  t.equals(trex1.name,    'trex', 'got a trex atom (video)')
  t.equals(trex1.trackID,      1, 'got correct track id')

  const trex2 = mvex.children[1]
  t.equals(trex2.name,    'trex', 'got a trex atom (audio)')
  t.equals(trex2.trackID,      2, 'got correct track id')

  ///////////// First trak (video)
  const trak1 = moov.children[1]
  t.equals(trak1.name, 'trak', 'got a trak atom (video)')

  const tkhd = trak1.children[0]
  t.equals(tkhd.name, 'tkhd', 'got a tkhd atom')

  const mdia1 = trak1.children[1]
  t.equals(mdia1.name, 'mdia', 'got a mdia atom')

  const minf1 = mdia1.children[2]
  t.equals(minf1.name, 'minf', 'got a minf atom')

  const vmhd = minf1.children[0]
  t.equals(vmhd.name, 'vmhd', 'got a vmhd atom')

  const stbl1 = minf1.children[2]
  t.equals(stbl1.name, 'stbl', 'got a stbl for the video track')

  const stsd1 = stbl1.children[0]
  t.equals(stsd1.name, 'stsd', 'got a stsd for the video track')

  const avc1 = stsd1.children[0]
  t.equals(avc1.name, 'avc1', 'got a avc1 atom')

  const avcC = avc1.children[0]
  t.equals(avcC.name, 'avcC', '-- got a avcC atom')

  const sps = muxer.config[0].codec[0]
  t.equals(avcC.profile,              sps[1], '--- profile matched muxer config')
  t.equals(avcC.profileCompatibility, sps[2], '--- profile compatibility matched muxer config')
  t.equals(avcC.levelIndication,      sps[3], '--- level indication matched config')

  ///////////// Second trak (audio)
  const trak2 = moov.children[2]
  t.equals(trak2.name, 'trak', 'got a trak atom (audio)')

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
  // fs.appendFileSync(out, new Buffer(initSegment))

  t.end()
})
