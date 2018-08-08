import * as bytes from '../../../helpers/byte-helpers'
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
      let configChunk = this.chunks .filter(c => c.hasConfig)[0]
      let sps         = configChunk.nalus.filter(n => (n[0] & 0x1f) === 7)[0]
      let pps         = configChunk.nalus.filter(n => (n[0] & 0x1f) === 8)[0]
      return [sps, pps]
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
  let accessUnit
  let lastClock
  let dur = 0
  while (packetIdx < streamPackets.length) {
    let packet = streamPackets[packetIdx]
    let data   = packet.data
    let cursor = 0

    while (cursor < data.byteLength) {

      const startCode = hasStartCode(data, cursor)
      if (startCode > 0) {

        // if (startCode === 3) {
        //   // if (type === 33) {
        //     console.log('--------');
        //     let reader = new bytes.BitReader(data)
        //     reader.currentBit = (cursor + startCode) * 8
        //     console.log(reader.readBits(8))
        //     reader.readBits(16);
        //     console.log('purple:', reader.readBits(2));
        //     console.log('scrambling:', reader.readBits(2));
        //     console.log('priority:', reader.readBit());
        //     console.log('align:', reader.readBit());
        //     console.log('copyright:', reader.readBit());
        //     console.log('original:', reader.readBit());
        //
        //     let p1 = reader.readBit()
        //     let p2 = reader.readBit()
        //
        //     if (p1 === 0 && p2 === 0) {
        //       console.log('no pts / dts');
        //     }
        //
        //     if (p1 === 0 && p2 === 1) {
        //       console.log('forbidden');
        //     }
        //
        //     // if (p1 === 1&& p2 === 0) {
        //     //   let high = reader.readBits(3)
        //     //   reader.readBit()
        //     //   let mid = reader.readBits(15)
        //     //   reader.readBit()
        //     //   let low = reader.readBits(15)
        //     //   reader.readBit()
        //     //   console.log(high, mid, low);
        //     // }
        //
        //     if (p1 === 1 && p2 === 1) {
        //       let high = reader.readBits(3)
        //       reader.readBit()
        //       let mid = reader.readBits(15)
        //       reader.readBit()
        //       let low = reader.readBits(15)
        //       reader.readBit()
        //       console.log(high, mid, low);
        //     }
        //
        //     // reader.readBits(6)
        //     // console.log(reader.readBits(8));
        //     // console.log(reader.readBit());
        //     // console.log(reader.readBit());
        //     // console.log(reader.readBit());
        //     // console.log(reader.readBit());
        // }
        const type = data[cursor + startCode]

        // }

        if (type === 9) {
          dur += 15
          if (accessUnit) { es.chunks.push(accessUnit) }
          accessUnit = new AccessUnit()
          accessUnit.duration = dur
          if (packet.header.adaptationField && packet.header.adaptationField.pcrBase) {
            lastClock = packet.header.adaptationField.pcrBase
            accessUnit.pcrBase = packet.header.adaptationField.pcrBase
          } else {
            accessUnit.pcrBase = lastClock
          }
          cursor += startCode
        }

      }

      if (accessUnit) { accessUnit.push(data[cursor]) }
      cursor += 1
    }

    packetIdx += 1
  }

  // for (var i = 0; i < es.chunks.length; i++) {
  //   let a = es.chunks[i]
  //   let b = es.chunks[i+1]
  //
  //   if (b) {
  //     a.duration = ((b.pcrBase - a.pcrBase))
  //   } else {
  //     a.duration = (es.chunks[i-1].duration)
  //   }
  // }
}

const hasStartCode = (data, cursor) => {
  if (data[cursor] === 0x00) {
    if (data[cursor+1] === 0x00) {

      if (data[cursor+2] === 0x01) {
        return 3
      }

      if (data[cursor+2] === 0x00) {
        if (data[cursor+3] === 0x01) {
          return 4
        }
      }

    }
  }
  return 0
}

class AccessUnit {
  constructor() {
    this.data = []
  }

  push(byte) {
    this.data.push(byte)
  }

  // get duration() {
  //   if (this.pcrBase) {
  //     return this.pcrBase >> 9
  //   }
  //   return 0
  // }

  get isKeyFrame() {
    return this.nalus.map(n => n[0] & 0x1f).filter(k => k === 5).length > 0
  }

  get hasConfig() {
    return this.nalus.map(n => n[0] & 0x1f).filter(k => (k === 7) || (k === 8)).length > 0
  }

  get nalusWithoutConfig() {
    if (this.hasConfig) {
      return this.nalus.filter(n => ((n[0] & 0x1f) !== 7) && ((n[0] & 0x1f) !== 8) )
    } else {
      return this.nalus
    }
  }

  get nalus() {
    let result    = []
    let cursor    = 0
    let nalu      = []
    const buffer  = new Uint8Array(this.data)
    while (cursor < buffer.byteLength) {
      const startCode = hasStartCode(buffer, cursor)
      if (startCode > 0) {
        const firstByte = buffer[cursor + startCode]
        const byteType = firstByte & 0x1f
        if (nalu) { result.push(nalu) }
        nalu = []
        cursor += startCode
        continue
      }

      if (nalu) { nalu.push(buffer[cursor]) }
      cursor += 1
    }
    // console.log(result.map(n => n[0] & 0x1f));
    return result
  }

  get type() {
    return this.data[0] & 0x1f
  }

  get length() {
    return this.nalus.reduce((a, c) => a + (c.length+4), 0)
  }
}


/**
 * Parse ADTS packets out of all audio packets
 */
const parseAudioPackets = (es, streamPackets) => {
  let packetIdx     = 0
  let currentFrame
  let firstFrame
  while (packetIdx < streamPackets.length) {
    let packet    = streamPackets[packetIdx]
    let bitReader = new bytes.BitReader(packet.data)
    while ((bitReader.currentBit) <= bitReader.length * 8) {

      if (currentFrame) {
        if (currentFrame.bytesToRead > 0) {
          currentFrame.payload += (bitReader.readBits(8))
          currentFrame.bytesToRead -= 1
          continue
        }
      }

      if (bitReader.readBits(12) === 0xfff) {
        let possibleMatch = new ADTS(bitReader)
        if (!firstFrame) {
          firstFrame   = possibleMatch
          currentFrame = possibleMatch
        } else {
          if (possibleMatch.samplingFreq !== firstFrame.samplingFreq) {
            bitReader.currentBit -= (possibleMatch.bitsRead + 11)
          } else {
            es.chunks.push(possibleMatch)
            currentFrame = possibleMatch
          }
        }
      }
    }
    packetIdx += 1
  }

}

class ADTS {
  constructor(bitReader) {
    this.version                 = bitReader.readBit()
    this.layer                   = bitReader.readBits(2)
    this.protectionAbsent        = bitReader.readBit()
    this.profileMinusOne         = bitReader.readBits(2)
    this.samplingFreq            = bitReader.readBits(4)
    this.privateBit              = bitReader.readBit()
    this.channelConfig           = bitReader.readBits(3)
    this.originality             = bitReader.readBit()
    this.home                    = bitReader.readBit()
    this.copyrightID             = bitReader.readBit()
    this.copyrightIDStart        = bitReader.readBit()
    this.frameLength             = bitReader.readBits(13)
    this.bufferFullness          = bitReader.readBits(11)
    this.numberOfFramesMinusOne  = bitReader.readBits(2)

    this.bitsRead = 44

    if (!this.protectionAbsent) {
      this.crc = bitReader.readBits(16)
      this.bitsRead += 16
    }

    const headerSize             = this.protectionAbsent === 1 ? 7 : 9
    this.bytesToRead             = ((this.frameLength) * (this.numberOfFramesMinusOne+1)) - headerSize
    this.payload                 = new Uint8Array()
  }
}

export default ElementaryStream
