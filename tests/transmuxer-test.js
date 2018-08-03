import { TransportStream } from '../src/slugline'
import MPEGParser from '../src/parsers/container/mpeg-parser'
import Transmuxer from '../src/transmuxing/transmuxer'
const test = require('tape')
const fs = require('fs')

const tsURL = './tests/fixtures/apple-basic-ts/gear1/fileSequence0.ts'
const asset = fs.readFileSync(tsURL)

const out = '/tmp/ftyp.mp4'

test.only('that we can create an init segment from a ts file', t=> {

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
