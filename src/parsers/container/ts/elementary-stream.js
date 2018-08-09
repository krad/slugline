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

      let pkts  = parsePES(streamPackets)
      let units = parseAccessUnits(pkts)

      units.forEach(au => {
        es.chunks.push(au)
        // console.log(au.nalus.map(n => n[0] & 0x1f), au.pts, au.dts);
      })

      // console.log(pkts.length);
      // console.log(units.length);
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
      let configChunk = this.chunks.filter(c => c.hasConfig)[0]
      let sps         = configChunk.nalus.filter(n => (n[0] & 0x1f) === 7)[0]
      let pps         = configChunk.nalus.filter(n => (n[0] & 0x1f) === 8)[0]
      // console.log(sps.map(s => s.toString(16)), pps.map(p => p.toString(16)));
      return [sps, pps]
    }

    if (this.streamType === 15) {
      return this.chunks[1]
    }
  }

}


const parsePES = (progamPackets) => {
  let packetIdx  = 0
  let result     = []
  let pes

  let syncBytes = new Uint8Array([0, 0, 0])
  while (packetIdx < progamPackets.length) {
    let packet = progamPackets[packetIdx]
    let reader = new bytes.BitReader(packet.data)

    while (reader.currentBit <= (reader.length * 8)) {
      syncBytes[2] = syncBytes[1]
      syncBytes[1] = syncBytes[0]
      syncBytes[0] = reader.readBits(8)
      if (syncBytes[2] === 0x00 && syncBytes[1] === 0x00 && syncBytes[0] === 0x01) {
        let type = reader.readBits(8)
        if (type === 0xe0) {
          if (pes) { result.push(pes) }
          pes = new PESPacket(type, reader)
        } else {
          pes.push(syncBytes[0])
          pes.push(type)
        }

      } else {
        if (pes) {
          pes.push(syncBytes[0])
        }
      }
    }
    packetIdx += 1
  }

  result.push(pes)
  return result
}

const parseAccessUnits = (pes) => {
  let packetIdx = 0
  let result    = []
  let accessUnit

  let syncBytes = new Uint8Array([0, 0, 0])
  while (packetIdx < pes.length) {
    let packet = pes[packetIdx]
    let buffer = new Uint8Array(packet.payload)
    let reader = new bytes.BitReader(buffer)
    while(reader.currentBit < reader.length * 8) {
      syncBytes[2] = syncBytes[1]
      syncBytes[1] = syncBytes[0]
      syncBytes[0] = reader.readBits(8)
      if (syncBytes[2] === 0x00 && syncBytes[1] === 0x00 && syncBytes[0] === 0x01) {

        const next = reader.readBits(8)
        const type = next & 0x1f
        if (type === 5) {
          console.log(type);
        }
        // console.log(type);
        if (type === 9) {
          if (accessUnit) { result.push(accessUnit) }
          accessUnit        = new AccessUnit()
          accessUnit.packet = packet.header
          accessUnit.push(next)
        } else {
          accessUnit.push(syncBytes[0])
          accessUnit.push(next)
        }

      } else {
        if (accessUnit) {
          accessUnit.push(syncBytes[0])
        }
      }
    }

    packetIdx += 1
  }

  result.push(accessUnit)

  return result
}


class PESPacket {

  constructor(streamID, reader) {
    this.header = {}

    this.header.streamID              = streamID
    this.header.length                = reader.readBits(16)

    this.header.markerBits             = reader.readBits(2)   // 10
    this.header.scramblingControl      = reader.readBits(2)
    this.header.priority               = reader.readBit()
    this.header.alignmentIndicator     = reader.readBit()
    this.header.copyright              = reader.readBit()
    this.header.originalOrCopyright    = reader.readBit()
    this.header.ptsDtsFlags            = reader.readBits(2)
    this.header.escrFlag               = reader.readBit()
    this.header.esRateFlag             = reader.readBit()
    this.header.dsmTrickMode           = reader.readBit()
    this.header.additionalCopyInfoFlag = reader.readBit()
    this.header.pesCRCFlag             = reader.readBit()
    this.header.pesExtFlag             = reader.readBit()
    this.header.pesHeaderDataLength    = reader.readBits(8)

    const bitAfterHeaderLengthCheck = reader.currentBit

    if (this.header.ptsDtsFlags === 2) {
      reader.readBits(4)
      let high = reader.readBits(3)
      reader.readBit()
      let mid = reader.readBits(15)
      reader.readBit()
      let low = reader.readBits(15)
      reader.readBit()
      this.header.pts = high + mid + low
    }

    if (this.header.ptsDtsFlags === 3) {
      reader.readBits(4)

      let high = reader.readBits(3)
      reader.readBit()
      let mid = reader.readBits(15)
      reader.readBit()
      let low = reader.readBits(15)
      reader.readBit()
      this.header.pts = (high + mid + low)

      reader.readBits(4)
      high = reader.readBits(3)
      reader.readBit()
      mid = reader.readBits(15)
      reader.readBit()
      low = reader.readBits(15)
      reader.readBit()
      this.header.dts = (high + mid + low)
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

      this.header.scr    = high + mid + low
      this.header.scrExt = ext
    }

    if (this.header.esRateFlag) {
      reader.readBit()
      this.header.esRate = reader.readBits(22)
      reader.readBit()
    }

    if (this.header.additionalCopyInfoFlag) {
      reader.readBit()
      this.header.additionalCopyInfo = reader.readBits(7)
    }

    if (this.header.pesCRCFlag) {
      this.header.pesCRC = reader.readBits(16)
    }

    if (this.header.pesExtFlag) {
      this.header.pesPrivateHeaderFlag         = reader.readBit()
      this.header.packHeaderFieldFlag          = reader.readBit()
      this.header.programPacketSeqCounterFlag  = reader.readBit()
      this.header.pSTDBufferFlag               = reader.readBit()
      reader.readBits(3)
      this.header.pesExtFlag2                  = reader.readBit()
    }

    if (this.header.programPacketSeqCounterFlag) {
      reader.readBit()
      this.header.packetSeqCounter = reader.readBits(7)
      reader.readBit()
      this.header.mpegIdent = reader.readBit()
      this.header.stuffingLength = reader.readBit(6)
    }

    if (this.header.pSTDBufferFlag) {
      reader.readBits(2)
      this.header.pSTDBufferScale = reader.readBit()
      this.header.pSTDBufferSize  = reader.readBits(13)
    }

    if (this.header.pesExtFlag2) {
      reader.readBit()
      this.header.pesExtFieldLength = reader.readBits(7)
      reader.readBits(8)
    }

    const bitAfterHeaderParsing = reader.currentBit
    const parsedBytes           = ((bitAfterHeaderParsing - bitAfterHeaderLengthCheck) / 8)
    if (parsedBytes !== this.header.pesHeaderDataLength) {
      console.log('!!!! Failed to parse full PES packet. !!!!')
    }

    this.payload = []
  }

  push(bytes) {
    this.payload.push(bytes)
  }

  get length() {
    return this.payload.length
  }

}

class AccessUnit {

  constructor() {
    this.data     = []
  }

  push(byte) {
    this.data.push(byte)
  }

  get pts() {
    if (this.packet) {
      return this.packet.pts
    }
    return undefined
  }

  get dts() {
    if (this.packet) {
      return this.packet.dts
    }
    return undefined
  }

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
    let results   = []
    let nalu      = []
    let buffer    = new Uint8Array(this.data)
    let reader    = new bytes.BitReader(buffer)
    let syncBytes = new Uint8Array([0, 0, 0])

    while(reader.currentBit < reader.length * 8) {
      syncBytes[2] = syncBytes[1]
      syncBytes[1] = syncBytes[0]
      syncBytes[0] = reader.readBits(8)

      if (syncBytes[2] === 0x00 && syncBytes[1] === 0x00 && syncBytes[0] === 0x01) {
        results.push(nalu.slice(0, -2))
        nalu = []
      } else {
        nalu.push(syncBytes[0])
      }
    }
    return results
  }

  get type() {
    return this.data[0] & 0x1f
  }

  get length() {
    return this.nalusWithoutConfig.reduce((a, c) => a + (c.length+4), 0)
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
