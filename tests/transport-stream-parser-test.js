const test  = require('tape')
const fs    = require('fs')
import TransportStream from '../src/parsers/container/ts/transport-stream'

const ts = fs.readFileSync('./tests/fixtures/fileSequence0.ts')

test.only('we can parse ts files', t=> {

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
  t.equals(2, pmt.tableId,              'table id was correct')
  t.equals(1, pmt.sectionSyntaxIndicator, 'section syntax indicator was correct')

  const trackA = pmt.tracks[0]
  t.ok(trackA, 'track present')
  t.equals(27, trackA.streamType,     'marked as a video track')
  t.equals(257, trackA.elementaryPID, 'es pid present')

  const mediaPacket = stream.packets[2]
  t.equals('MediaPacket', mediaPacket.constructor.name, 'got a media packet')
  t.ok(mediaPacket.streamType, 'stream type was present')

  const videoPackets = stream.packets.filter(p => p.header.PID === trackA.elementaryPID)
  videoPackets.forEach(v =>  {
    v.parse()
    console.log(v.nalus);
  })

  t.end()
})

const unique = (arr) => {
  return arr.filter((val, idx, self) => {
    return self.indexOf(val) === idx
  })
}
