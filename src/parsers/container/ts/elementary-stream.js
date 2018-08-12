import * as bytes from '../../../helpers/byte-helpers'
import PESPacket from './pes-packet'
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
    const track = pmt.tracks.filter(t => t.streamType === streamType)[0]

    if (!pmt)   { throw 'PMT not present in transport stream' }
    if (!track) { throw 'Track for stream type not found' }

    const streamPackets = transportStream.packets.filter(p => p.header.PID === track.elementaryPID)

    let delimiter
    if (streamType === 27) { delimiter = 0xe0 }
    if (streamType === 15) { delimiter = 0xc0 }

    let itr = bytes.elementaryStreamIterator(streamPackets, [0, 0, 1, delimiter], true)
    let cnt = 0
    let pcrBase
    while(1) {
      let next = itr.next()
      if (next) {
          let b = new bytes.BitReader(next.slice(4))
          let pkt = itr.reader.currentPacket()
          if (pkt && pkt.header) {
            if (pkt.header.adaptationField) {
              if (pkt.header.adaptationField.pcrBase) {
                pcrBase = pkt.header.adaptationField.pcrBase
              }
            }
          }

          let p = new PESPacket(delimiter, b, cnt)
          p.header.pcrBase = pcrBase
          es.packets.push(p)
          cnt += 1
      } else {
        break
      }
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

    // A	12	syncword 0xFFF, all bits must be 1
    // B	1	MPEG Version: 0 for MPEG-4, 1 for MPEG-2
    // C	2	Layer: always 0
    // D	1	protection absent, Warning, set to 1 if there is no CRC and 0 if there is CRC
    // E	2	profile, the MPEG-4 Audio Object Type minus 1
    // F	4	MPEG-4 Sampling Frequency Index (15 is forbidden)
    // G	1	private bit, guaranteed never to be used by MPEG, set to 0 when encoding, ignore when decoding
    // H	3	MPEG-4 Channel Configuration (in the case of 0, the channel configuration is sent via an inband PCE)
    // I	1	originality, set to 0 when encoding, ignore when decoding
    // J	1	home, set to 0 when encoding, ignore when decoding
    // K	1	copyrighted id bit, the next bit of a centrally registered copyright identifier, set to 0 when encoding, ignore when decoding
    // L	1	copyright id start, signals that this frame's copyright id bit is the first bit of the copyright id, set to 0 when encoding, ignore when decoding
    // M	13	frame length, this value must include 7 or 9 bytes of header length: FrameLength = (ProtectionAbsent == 1 ? 7 : 9) + size(AACFrame)
    // O	11	Buffer fullness
    // P	2	Number of AAC frames (RDBs) in ADTS frame minus 1, for maximum compatibility always use 1 AAC frame per ADTS frame
    // Q	16
    if (this.streamType === 15) {
      const c = this.codecBytes
      return ['mp4a', 40, c.profileMinusOne+1].join('.')
    }

    return undefined
  }

  get codecBytes() {
    if (this.streamType === 27) {
      let configChunk = this.chunks.filter(c => c.hasConfig)[0]
      let sps         = configChunk.allNalus.filter(n => (n[0] & 0x1f) === 7)[0]
      let pps         = configChunk.allNalus.filter(n => (n[0] & 0x1f) === 8)[0]
      // console.log(sps.map(s => s.toString(16)), pps.map(p => p.toString(16)));
      return [sps, pps]
    }

    if (this.streamType === 15) {
      return this.chunks[1]
    }
  }

}


export default ElementaryStream
