const test = require('tape')
import TYPES from '../src/types'

test('that we map all types correctly', t=> {

  t.equals('Array',              TYPES.Array, 'Array was correct')
  t.equals('Uint8Array',    TYPES.Uint8Array, 'Uint8Array was correct')
  t.equals('PAT',                  TYPES.PAT, 'PAT was correct')
  t.equals('PMT',                  TYPES.PMT, 'PMT was correct')
  t.equals('NALU',                TYPES.NALU, 'NALU was correct')
  t.equals('Packet',            TYPES.Packet, 'Packet was correct')
  t.equals('MediaPacket',  TYPES.MediaPacket, 'MediaPacket was correct')
  t.equals('PESPacket',      TYPES.PESPacket, 'PESPacket was correct')

  t.equals('MediaInitializationSegment', TYPES.MediaInitializationSegment, 'MediaInitializationSegment was correct')
  t.equals('MediaSegment',     TYPES.MediaSegment, 'MediaSegment was correct')
  // t.equals('MediaPlaylist',   TYPES.MediaPlaylist, 'MediaPlaylist was correct')
  // t.equals('MasterPlaylist', TYPES.MasterPlaylist, 'MasterPlaylist was correct')
  // t.equals('VariantStream',   TYPES.VariantStream, 'VariantStream was correct')
  // t.equals('Rendition',           TYPES.Rendition, 'Rendition was correct')


  t.end()
})
