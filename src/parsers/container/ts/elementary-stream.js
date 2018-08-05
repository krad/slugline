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

    if (streamType === 27) {
      parseVideoPackets(es, streamPackets)
    }

    if (streamType === 15) {
      parseAudioPackets(es, streamPackets)
    }

    return es
  }

  constructor(streamType) {
    this.streamType = streamType
    this.chunks      = []
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
      return this.chunks.filter(nalu => {
        const naluType = nalu[0] & 0x1f
        if (naluType === 7 || naluType === 8) { return nalu }
      }).slice(0, 2)
    }

    if (this.streamType === 15) {
      return this.chunks[1]
    }
  }

}


/**
 * Parse h264 NALUs found across all video packets
 */
const parseVideoPackets = (es, streamPackets) => {
  let packetIdx       = 0
  let nalu            = []
  let gotFirst        = false
  while (packetIdx < streamPackets.length) {
    let packet = streamPackets[packetIdx]
    let data   = packet.data
    let cursor = 0

    while (cursor < data.byteLength) {
      const found = foundDelimiter(data, cursor)
      if (found[0]) {
        if (gotFirst) {
          es.chunks.push(nalu)
          nalu = []
        } else {
          gotFirst = true
        }
        cursor += found[1]
      } else {
        if (gotFirst) { nalu.push(data.getUint8(cursor)) }
        cursor += 1
      }
    }

    packetIdx += 1
  }
}

const foundDelimiter = (data, cursor) => {
  if (cursor < data.byteLength - 4) {
    if (data.getUint8(cursor) === 0x00) {
      if (data.getUint8(cursor+1) === 0x00) {
        if (data.getUint8(cursor+2) === 0x01) { return [true, 3] }
        if (data.getUint8(cursor+2) === 0x00) {
          if (data.getUint8(cursor+3) === 0x01) { return [true, 4] }
        }
      }
    }
  }
  return [false, 1]
}


/**
 * Parse ADTS packets out of all audio packets
 */
const parseAudioPackets = (es, streamPackets) => {
  let packetIdx = 0
  let frame     = []
  let gotFirst  = false
  while (packetIdx < streamPackets.length) {
    let packet  = streamPackets[packetIdx]
    let data    = packet.data
    let cursor  = 0
    while (cursor < data.byteLength) {
      if (foundSyncWord(data, cursor+1)) {
        if (frame.length > 0) {
          frame.push(data.getUint8(cursor))
          if (frame.length >= 7) {
            es.chunks.push(new ADTSFrame(frame))
          }
          frame = []
        }
      } else {
        frame.push(data.getUint8(cursor))
      }
      cursor+=1
    }
    packetIdx += 1
  }
}

class ADTSFrame {
  constructor(frame) {
    let array              = Uint8Array.from(frame)
    let view               = new DataView(array.buffer)
    this.version           = (view.getUint16(0) << 12) & 0xf
    this.layer             = (view.getUint16(0) << 13) & 0xff
    this.protectionAbsent  = (view.getUint16(0) << 15) & 0xf

    this.profileMinusOne   = (view.getUint8(2) & 0xf)
    this.samplingFreq      = ((view.getUint8(2) << 2) & 0x3C)
    this.channelConfig     = ((view.getUint16(2)) >> 7) & 0x7
  }
}

const foundSyncWord = (data, cursor) => {
  if (cursor < data.byteLength - 1) {
    if (((data.getUint16(cursor) >> 4) & 0xff) === 0xff) {
      return true
    }
  }
  return false
}

export default ElementaryStream
