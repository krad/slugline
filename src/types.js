import PAT from './parsers/container/ts/pat'
import PMT from './parsers/container/ts/pmt'
import NALU from './parsers/container/ts/nalu'
import { Packet, MediaPacket } from './parsers/container/ts/packet'
import PESPacket from './parsers/container/ts/pes-packet'
import { MediaInitializationSegment, MediaSegment } from './segment'
// import { MediaPlaylist, MasterPlaylist, VariantStream, Rendition } from './playlist'

const TYPES = {
  Array: Array.prototype.constructor.name,
  Uint8Array: Uint8Array.prototype.constructor.name,
  PAT: PAT.prototype.constructor.name,
  PMT: PMT.prototype.constructor.name,
  NALU: NALU.prototype.constructor.name,
  Packet: Packet.prototype.constructor.name,
  MediaPacket: MediaPacket.prototype.constructor.name,
  PESPacket: PESPacket.prototype.constructor.name,
  MediaInitializationSegment: MediaInitializationSegment.prototype.constructor.name,
  MediaSegment: MediaSegment.prototype.constructor.name,
  // MediaPlaylist: MediaPlaylist.prototype.constructor.name,
  // MasterPlaylist: MasterPlaylist.prototype.constructor.name,
  // VariantStream: VariantStream.prototype.constructor.name,
  // Rendition: Rendition.prototype.constructor.name
}

export default TYPES
