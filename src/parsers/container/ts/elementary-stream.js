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
  while (packetIdx < streamPackets.length) {
    let packet = streamPackets[packetIdx]
    let reader = new bytes.BitReader(packet.data)
    while (reader.currentBit < reader.length * 8) {
      let startCode = reader.readBits(24)
      if (startCode === 0x000001) {
        let type = reader.readBits(8)
        if (type === 0xe0) {
          let pes = new PESPacket(type, reader)
          console.log(pes);
        }
      }
    }

    packetIdx += 1
  }
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

class PESPacket {

  constructor(streamID, reader) {
    this.streamID = streamID
    this.length   = reader.readBits(16)

    reader.readBits(2)   // 10
    this.scramblingControl      = reader.readBits(2)
    this.priority               = reader.readBit()
    this.alignmentIndicator     = reader.readBit()
    this.copyright              = reader.readBit()
    this.originalOrCopyright    = reader.readBit()
    this.ptsDtsFlags            = reader.readBits(2)
    this.escrFlag               = reader.readBit()
    this.esRateFlag             = reader.readBit()
    this.dsmTrickMode           = reader.readBit()
    this.additionalCopyInfoFlag = reader.readBit()
    this.pesCRCFlag             = reader.readBit()
    this.pesExtFlag             = reader.readBit()
    this.pesHeaderDataLength    = reader.readBits(8)

    if (this.ptsDtsFlags === 2) {
      reader.readBits(4)
      let high = reader.readBits(3)
      reader.readBit()
      let mid = reader.readBits(15)
      reader.readBit()
      let low = reader.readBits(15)
      reader.readBit()
      this.pts = high + mid + low
    }

    if (this.ptsDtsFlags === 3) {
      reader.readBits(4)
      let high = reader.readBits(3)
      reader.readBit()
      let mid = reader.readBits(15)
      reader.readBit()
      let low = reader.readBits(15)
      reader.readBit()
      this.pts = high + mid + low

      reader.readBits(4)
      high = reader.readBits(3)
      reader.readBit()
      mid = reader.readBits(15)
      reader.readBit()
      low = reader.readBits(15)
      reader.readBit()
      this.dts = high + mid + low
    }

    if (this.escrFlag) {
      reader.readBits(2)
      let high = reader.readBits(3)
      reader.readBit()
      let mid = reader.readBits(15)
      reader.readBit()
      let low = reader.readBits(15)
      reader.readBit()
      let ext = reader.readBits(9)
      reader.readBit()

      this.scr    = high + mid + low
      this.scrExt = ext
    }

    if (this.esRateFlag) {
      reader.readBit()
      this.esRate = reader.readBits(22)
      reader.readBit()
    }

    if (this.additionalCopyInfoFlag) {
      reader.readBit()
      this.additionalCopyInfo = reader.readBits(7)
    }

    if (this.pesCRCFlag) {
      this.pesCRC = reader.readBits(16)
    }

    if (this.pesExtFlag) {
      this.pesPrivateHeaderFlag         = reader.readBit()
      this.packHeaderFieldFlag          = reader.readBit()
      this.programPacketSeqCounterFlag  = reader.readBit()
      this.pSTDBufferFlag               = reader.readBit()
      reader.readBits(3)
      this.pesExtFlag2                  = reader.readBit()
    }

    if (this.programPacketSeqCounterFlag) {
      reader.readBit()
      this.packetSeqCounter = reader.readBits(7)
      reader.readBit()
      this.mpegIdent = reader.readBit()
      this.stuffingLengt = reader.readBit(6)
    }

    if (this.pSTDBufferFlag) {
      reader.readBits(2)
      this.pSTDBufferScale = reader.readBit()
      this.pSTDBufferSize  = reader.readBits(13)
    }

    if (this.pesExtFlag2) {
      reader.readBit()
      this.pesExtFieldLength = reader.readBits(7)
      reader.readBits(8)
    }

    console.log(reader.currentBit, reader.length);
  }

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

  get pes() {
    let result = []
    const buffer = new Uint8Array(this.data)
    const reader = new bytes.BitReader(buffer)
    while (reader.currentBit < reader.length * 8) {
      const startCode = reader.readBits(24)
      if (startCode === 0x000001) {
        let type = reader.readBits(8)
        console.log(type.toString(16), type & 0x1f);

        // console.log('sync');
      }
    }

  }

  get nalus() {
    // this.pes
    return []
    // let result    = []
    // let cursor    = 0
    // let nalu      = []
    // const buffer  = new Uint8Array(this.data)
    // while (cursor < buffer.byteLength) {
    //   const startCode = hasStartCode(buffer, cursor)
    //   if (startCode > 0) {
    //     const firstByte = buffer[cursor + startCode]
    //
    //     if (firstByte === 0xe0) {
    //       let reader = new bytes.BitReader(buffer)
    //       reader.currentBit = (cursor + startCode + 1) * 8
    //       console.log('-------------');
    //       console.log(reader.readBits(16))
    //       console.log(reader.readBits(2));
    //       reader.readBits(6)
    //       console.log(reader.readBits(2));
    //       reader.readBits(6)
    //       console.log(reader.readBits(8))
    //       console.log(reader.readBits(4));
    //
    //       let ptsHigh = reader.readBits(3)
    //       console.log('pts high', ptsHigh);
    //       console.log(reader.readBit());
    //
    //       let ptsMid = reader.readBits(15)
    //       console.log('pts mid', ptsMid);
    //       console.log(reader.readBit());
    //       let ptsLow = reader.readBits(15)
    //       console.log('pts low', ptsLow);
    //       console.log(reader.readBit());
    //
    //       console.log(reader.readBits(4));
    //
    //       let dtsHigh = reader.readBits(3)
    //       console.log('dts high', dtsHigh);
    //       console.log(reader.readBit());
    //
    //       let dtsMid = reader.readBits(15)
    //       console.log('dts mid', dtsMid);
    //       console.log(reader.readBit());
    //
    //       let dtsLow = reader.readBits(15)
    //       console.log('dts low', dtsLow);
    //       console.log(reader.readBit());
    //
    //       let pts = (ptsHigh + ptsMid + ptsLow)
    //       let dts = (dtsHigh + dtsMid + dtsLow)
    //       console.log('pts', pts);
    //       console.log('dts', dts);
    //
    //       this.dts = dts
    //       this.pts = pts
    //       cursor += 1
    //       continue
    //
    //     }
    //
    //     const byteType = firstByte & 0x1f
    //     if (nalu) { result.push(nalu) }
    //     nalu = []
    //     cursor += startCode
    //     continue
    //   }
    //
    //   if (nalu) { nalu.push(buffer[cursor]) }
    //   cursor += 1
    // }
    // // console.log(result.map(n => n[0] & 0x1f));
    // return result
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
