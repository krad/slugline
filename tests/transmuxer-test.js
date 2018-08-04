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

test('that we can create an init segment from a ts file', t=> {

  const buffer = Uint8Array.from(asset)
  let ts = TransportStream.parse(buffer)
  t.equals(1551, ts.packets.length, '😃')

  let muxer       = new Transmuxer(ts)
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
  t.equals(moov.children.length,     3, 'we got children in the moov atom')
  // console.log(moov);

  const mvhd = moov.children[0]
  t.equals(mvhd.name, 'mvhd', 'got a mvhd atom')

  const trak = moov.children[1]
  t.equals(trak.name, 'trak', 'got a trak atom')

  const tkhd = trak.children[0]
  t.equals(tkhd.name, 'tkhd', 'got a tkhd atom')

  const mdia = trak.children[1]
  t.equals(mdia.name, 'mdia', 'got a mdia atom')

  const mdhd = mdia.children[0]
  t.equals(mdhd.name, 'mdhd', 'got a mdhd atom')

  const hdlr = mdia.children[1]
  t.equals(hdlr.name, 'hdlr', 'got a hdlr atom')

  const minf = mdia.children[2]
  t.equals(minf.name, 'minf', 'got a minf atom')

  const vmhd = minf.children[0]
  t.equals(vmhd.name, 'vmhd', 'got a vmhd atom')

  const smhd = minf.children[1]
  t.equals(smhd.name, 'smhd', 'got a smhd atom')

  const dinf = minf.children[2]
  t.equals(dinf.name, 'dinf', 'got a dinf atom')

  const dref = dinf.children[0]
  t.equals(dref.name, 'dref', 'got a dref atom')

  const stbl = minf.children[3]
  t.equals(stbl.name, 'stbl', 'got a stbl atom')

  const stsd = stbl.children[0]
  t.equals(stsd.name, 'stsd', 'got a stsd atom')

  const stts = stbl.children[1]
  t.equals(stts.name, 'stts', 'got a stts atom')

  const stsc = stbl.children[2]
  t.equals(stsc.name, 'stsc', 'got a stsc atom')

  const stsz = stbl.children[3]
  t.equals(stsz.name, 'stsz', 'got a stsz atom')

  const stco = stbl.children[4]
  t.equals(stco.name, 'stco', 'got a stco atom')

  fs.appendFileSync(out, new Buffer(initSegment))

  t.end()
})
