import * as bytes from '../../../helpers/byte-helpers'
import TYPES from '../../../types'
import PESPacket from './pes-packet'
import AccessUnit from './access-unit'
import ADTS from './adts'
class ElementaryStream {

  /**
   * @static parse - Parse an elementary stream out of transport stream
   *
   * @param  {TransportStream} transportStream Transport stream that contains all packets
   * @param  {Integer} streamType      Code for the stream you want to parse out (27 = vid / 15 = audio)
   * @return {ElementaryStream}        An ElementaryStream object with all parsed chunks in a chunks array
   */
  static parse(transportStream, streamType, trackID) {
    let es      = new ElementaryStream(streamType)
    es.trackID  = trackID

    const pmt   = transportStream.packets.filter(p => p.objType === TYPES.PMT)[0]
    const track = pmt.programs[0].tracks.filter(t => t.streamType === streamType)[0]

    if (!pmt)   { throw 'PMT not present in transport stream' }
    if (!track) { throw 'Track for stream type not found' }

    let streamPackets = transportStream.packets
    .filter(p => p.header.PID === track.elementaryPID)

    let delimiter
    if (streamType === 27) { delimiter = 0xe0 }
    if (streamType === 15) { delimiter = 0xc0 }
    if (streamType === 21) { return es }

    if (streamPackets.length === 0) { return es }

    // console.log('LENGTH CHECK');
    if (packetsHaveLength(streamPackets, delimiter)) {
      // console.log('GOT LENGTH');
      es.packets = parsePacketsByHeaders(streamPackets, delimiter)
    } else {
      // console.log('BY CHUNK');
      es.packets = parsePacketsByChunks(streamPackets, delimiter)
    }

    return es
  }

  constructor(streamType) {
    this.streamType = streamType
    this.packets    = []
  }

  /**
   * get codec - Parses the codec informatino out of the stream
   *
   * @return {type}  description
   */
  get codec() {
    // Video
    if (this.streamType === 27) {
      const c                     = this.codecBytes
      const arrayBuffer           = Uint8Array.from(c[0])
      const view                  = new DataView(arrayBuffer.buffer)
      const version               = view.getUint8(0)
      const profile               = view.getUint8(1)
      const profileCompatibility  = view.getUint8(2)
      const levelIndication       = view.getUint8(3)

      const params = [profile, profileCompatibility, levelIndication].map(function(i) {
        return ('0' + i.toString(16).toUpperCase()).slice(-2)
      }).join('');
      return ['avc1', params].join('.')
    }

    if (this.streamType === 15) {
      const c = this.codecBytes
      return ['mp4a', 40, c.header.profileMinusOne+1].join('.')
    }

    return undefined
  }

  get codecBytes() {
    if (this.streamType === 27) {
      let result = AccessUnit.parse(this)
      let sps   = result.sps
      let pps   = result.pps

      return [sps.rbsp, pps.rbsp]
    }

    if (this.streamType === 15) {
      return ADTS.parse(this).units[0]
    }
  }

}

const packetsHaveLength = (packets, delimiter) => {
  let itr = bytes.elementaryStreamIterator(packets, [0, 0, 1, delimiter], true)
  let next = itr.next()
  if (next) {
    let buffer    = new Uint8Array(next)
    let reader    = new bytes.BitReader(buffer)
    let pesPacket = new PESPacket(reader, 0)
    if (pesPacket.header.packetLength) {
      return true
    }
  }
  return false
}

const parsePacketsByHeaders = (packets, delimiter) => {
  let results   = []
  let cnt       = 0
  let reader    = bytes.streamReader(packets)
  let sync      = new Uint8Array([255, 255, 255])
  while(1) {
    if (reader.atEnd()) { break }
    const byte = reader.readBits(8)
    if (byte === undefined) { break }

    sync[2] = sync[1]
    sync[1] = sync[0]
    sync[0] = byte

    if (sync[2] === 0x00 && sync[1] === 0x00 && sync[0] === 0x01) {
      let next = reader.readBits(8)
      if (next === delimiter) {
        reader.rewind(32)
        let pesPacket = new PESPacket(reader, cnt++)
        results.push(pesPacket)
      } else {
        reader.rewind(8)
      }
    }

  }

  return results
}

const parsePacketsByChunks = (packets, delimiter) => {
  let results = []
  let itr    = bytes.elementaryStreamIterator(packets, [0, 0, 1, delimiter], true)
  let cnt    = 0
  while(1) {
    let next = itr.next()
    if (next) {
      let buffer    = new Uint8Array(next)
      let reader    = new bytes.BitReader(buffer)
      let pesPacket = new PESPacket(reader, cnt++)
      results.push(pesPacket)
    } else {
      break
    }
  }
  return results
}

export default ElementaryStream
