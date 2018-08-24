import PAT from './parsers/container/ts/pat'
import PMT from './parsers/container/ts/pmt'
import NALU from './parsers/container/ts/nalu'
import { Packet, MediaPacket } from './parsers/container/ts/packet'
import PESPacket from './parsers/container/ts/pes-packet'
import { MediaInitializationSegment, MediaSegment } from './segment'
// import { MediaPlaylist, MasterPlaylist, VariantStream, Rendition } from './playlist'

const TYPES = {
  Array: 'Array',
  Uint8Array: 'Uint8Array',
  PAT: 'PAT',
  PMT: 'PMT',
  NALU: 'NALU',
  Packet: 'Packet',
  MediaPacket: 'MediaPacket',
  PESPacket: 'PESPacket',
  MediaInitializationSegment: 'MediaInitializationSegment',
  MediaSegment: 'MediaSegment',
  // MediaPlaylist: MediaPlaylist.prototype.constructor.name,
  // MasterPlaylist: MasterPlaylist.prototype.constructor.name,
  // VariantStream: VariantStream.prototype.constructor.name,
  // Rendition: Rendition.prototype.constructor.name
}

export default TYPES
