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

  // Get the default atom
  const ftyp = atoms.ftyp()
  t.equals(4, ftyp.length, 'got correct amount of byte sequenes')

  // See if we can flatten the atom
  const result = atoms.flatten(ftyp)
  t.equals(7, result.length, 'correctly flattened the atom')

  // Prepend the size of all the bytes in the atom to the head
  const result2 = atoms.prependSize(ftyp)
  t.equals(8, result2.length, 'got the correct amount of atoms')

  // Make sure we got the correct size back
  let view = new DataView(result2[0].buffer)
  t.equals(32, view.getUint32(0), 'got the correct size of the atom')

  /// Now make sure we can correctly size atoms that contain atoms
  const mvex    = atoms.mvex()
  t.equals(2, mvex.length,       'there are 2 entries by default.  mvex label and trex child atom')
  t.equals(1, mvex[1].length,    'child atom is an array contained in another array')
  t.equals(8, mvex[1][0].length, 'trex atom has 8 entries (does not include size yet)')

  const result3  = atoms.prepare(mvex)
  t.equals(2, result3.length, 'structure has the mvex and trex entries as arrays now')
  t.equals(2, result3[0].length, 'mvex size and tag entry')
  t.equals(9, result3[1].length, 'trex atom with size prepended')

  const result4   = atoms.build(mvex)
  const lastView  = new DataView(result4.buffer)

  t.ok(lastView, 'able to build a view out of the constructed atom')
  t.equals(40, lastView.getUint32(0), 'got the correct size of the atom (40 bytes)')
  t.equals('mvex', bytes.bufferToStr(result4.slice(4, 8)), 'got the mvex atom label')
  t.equals(32, lastView.getUint32(8), 'got the trex size byte')
  t.equals('trex', bytes.bufferToStr(result4.slice(12, 16)), 'got the trex atom label')

  t.end()
})

test('that we can create an init segment from a ts file', t=> {

  const buffer = Uint8Array.from(asset)
  let ts = TransportStream.parse(buffer)
  t.equals(1551, ts.packets.length, '😃')

  let muxer       = new Transmuxer(ts)
  let initSegment = muxer.buildInitializationSegment()
  t.ok(initSegment, 'we got an init segment')
  let atomtree = MPEGParser.parse(initSegment[0])

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

  console.log(atomtree.root);
  initSegment.forEach(s => {
    fs.appendFileSync(out, new Buffer(s))
  })

  t.end()
})
