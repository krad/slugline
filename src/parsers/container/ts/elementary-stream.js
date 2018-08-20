import * as bytes from '../../../helpers/byte-helpers'
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

    const pmt   = transportStream.packets.filter(p => p.constructor.name === 'PMT')[0]
    const track = pmt.programs[0].tracks.filter(t => t.streamType === streamType)[0]

    if (!pmt)   { throw 'PMT not present in transport stream' }
    if (!track) { throw 'Track for stream type not found' }

    let streamPackets = transportStream.packets
    .filter(p => p.header.PID === track.elementaryPID)

    let delimiter
    if (streamType === 27) { delimiter = 0xe0 }
    if (streamType === 15) { delimiter = 0xc0 }
    if (streamType === 21) { return es }
    console.log(streamType);

    if (packetsHaveLength(streamPackets, delimiter)) {
      es.packets = parsePacketsByHeaders(streamPackets, delimiter)
    } else {
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
  let results = []
  let itr    = bytes.elementaryStreamIterator(packets, [0, 0, 1], true)
  let cnt    = 0
  let pesPacket
  while(1) {
    let next = itr.next()
    if (next) {

      if (next[3] === 0) {
        console.log(next.slice(0, 10));
        next = next.slice(5)
      }

      let buffer    = new Uint8Array(next)
      let reader    = new bytes.BitReader(buffer)

      if (pesPacket) {
        while (!pesPacket.isFull) {
          if (reader.atEnd())     { break }
          let byte = reader.readBits(8)
          pesPacket.push(byte)
        }

        if (pesPacket.isFull) {
          results.push(pesPacket)
          cnt += 1
          pesPacket = undefined
        }

      } else {

        pesPacket = new PESPacket(reader, cnt)
        if (pesPacket.header.packetLength) {
          if (pesPacket.isFull) {
            results.push(pesPacket)
            cnt += 1
            pesPacket = undefined
          }
        } else {
          results.push(pesPacket)
          cnt += 1
          pesPacket = undefined
        }

      }

    } else {
      if (pesPacket) { results.push(pesPacket) }

      break
    }
  }

  results = results.filter(p => p.data.length !== 0)
  results.forEach(p => {
    console.log(p.header.streamID, p.length, p.header.packetLength)
  })

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
      let pesPacket = new PESPacket(reader, cnt)
      results.push(pesPacket)
      cnt += 1
    } else {
      break
    }
  }
  return results
}

export default ElementaryStream
