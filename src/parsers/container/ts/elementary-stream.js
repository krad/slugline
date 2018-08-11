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
    const programPIDs = pmt.tracks.map(t => t.elementaryPID)

    if (!pmt)   { throw 'PMT not present in transport stream' }
    if (!track) { throw 'Track for stream type not found' }

    const streamPackets = transportStream.packets.filter(p => p.header.PID === track.elementaryPID)
    // const streamPackets = transportStream.packets.filter(p => programPIDs.includes(p.header.PID))

    let pkts  = parsePES(streamPackets)
    let units = parseAccessUnits(pkts)

    // console.log(units[0].nalus[7].nalu.slice(0, 10));

    units.forEach(au => { es.chunks.push(au) })

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


const parsePES = (programPackets) => {
  let result = []

  const itr = bytes.elementaryStreamIterator(programPackets, [0x00, 0x00, 0x01, 0xe0])
  let parse = true
  let cnt = 0
  while (parse) {
    let p = itr.next()
    if (p === undefined) { parse = false; break }

    let currentProgramPacket = itr.reader.currentPacket()
    
    const packet = new PESPacket(0xe0, cnt, new bytes.BitReader(p))
    if (currentProgramPacket) {
      packet.header.programPacketHeader = currentProgramPacket.header
    }

    result.push(packet)
    cnt += 1
  }


  return result
}

const parseAccessUnits = (pes) => {
  let result = []

  let delimiter = [0x00, 0x00, 0x00, 0x01]
  let packetWithAlignment = pes.filter(p => p.header.alignmentIndicator === 1)[0]
  if (packetWithAlignment) {
    let pktData = packetWithAlignment.data.slice(0, 4)
    if (pktData.slice(3) !== 1) {
      delimiter = [0x00, 0x00, 0x01]
    }
  }

  for (var i = 0; i < pes[0].data.length; i += 10) {
    console.log(pes[0].data.slice(i, i+11));
  }
  // console.log(pes[0]);


  const itr = bytes.elementaryStreamIterator(pes, delimiter)

  let parse = true
  let accessUnit
  let cnt   = 0
  while(parse) {
    let nalu = itr.next()

    if (nalu === undefined) { parse = false; break }

    let reader        = new bytes.BitReader(nalu)
    let forbidden_bit = reader.readBit()
    let nal_ref_idc   = reader.readBits(2)
    let nal_unit_type = reader.readBits(5)

    let currentPacket = itr.reader.currentPacket()

    if (nal_unit_type === 9) {// && forbidden_bit === 0) {
      if (accessUnit) { result.push(accessUnit) }
      accessUnit = new AccessUnit(cnt)
      accessUnit.push({nalu: nalu, packet: currentPacket.header})
      cnt += 1
    } else {
      // if (forbidden_bit === 0) {
        if (currentPacket) {
          accessUnit.push({nalu: nalu, packet: currentPacket.header})
        } else {
          accessUnit.push({nalu: nalu})
        }
      // } else {
        // console.log('0000', nalu.slice(0, 10));
        // let lastNalu = accessUnit.lastNalu.nalu
        // accessUnit.appendToLast(nalu)
      // }
    }
  }

  return result
}

class PESPacket {

  constructor(streamID, cntID, reader) {
    this.header = {}
    this.header.cntID                 = cntID
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
      let low = reader.readBits(3)
      reader.readBit()
      let mid = reader.readBits(15)
      reader.readBit()
      let high = reader.readBits(15)
      reader.readBit()

      let pts = 0
      pts = (pts >> 30) | high
      pts = (pts >> 15) | mid
      pts = (pts >> 3) | low

      this.header.pts = pts
    }

    if (this.header.ptsDtsFlags === 3) {
      reader.readBits(4)

      let high = reader.readBits(3)
      reader.readBit()
      let mid = reader.readBits(15)
      reader.readBit()
      let low = reader.readBits(15)
      reader.readBit()

      let pts = 0
      pts = (pts >> 30) | high
      pts = (pts >> 15) | mid
      pts = (pts >> 3) | low

      this.header.pts = pts

      reader.readBits(4)
      high = reader.readBits(3)
      reader.readBit()
      mid = reader.readBits(15)
      reader.readBit()
      low = reader.readBits(15)
      reader.readBit()

      let dts = 0
      dts = (dts >> 30) | high
      dts = (dts >> 15) | mid
      dts = (dts >> 3) | low

      this.header.dts = dts
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

      this.header.scr    = low + mid + high
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
      console.log(this)
      console.log('parsed bytes:', parsedBytes)
      console.log('parsed header length:', this.header.pesHeaderDataLength)
    }


    this.data = []
    while (!reader.atEnd()) {
      let bits = reader.readBits(8)
      this.data.push(bits)
    }

  }

  push(bytes) {
    this.data.push(bytes)
  }

  get length() {
    return this.data.length
  }

}

class AccessUnit {

  constructor(id) {
    this.id    = id
    this.nalus = []
  }

  push(nalu) {
    this.nalus.push(nalu)
  }

  appendToLast(bytes) {
    console.log('id', this.id);
    let last = this.nalus.pop()
    console.log(last.nalu.slice(0, 10));
    console.log(last.nalu.constructor.name);
    // console.log(last.packet);
    // console.log(last.nalu[0] & 0x1f);
    // console.log(last.nalu.length);
    last.nalu.push(...bytes)
    // console.log(last.nalu.length);
    this.push(last)
  }

  get lastNalu() {
    return this.nalus[this.nalus.length-1]
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

  get duration() {
    let pcrBase = unique(this.nalus.filter(n => n.packet != undefined)
    .filter(p => p.packet.programPacketHeader != undefined)
    .filter(p => p.packet.programPacketHeader.adaptationField != undefined)
    .map(p => p.packet.programPacketHeader.adaptationField.pcrBase))[0]

    if (this.dts) { return this.dts }
    else { return this.pts }
  }

  get packet() {
    return this.nalus[0].packet
  }

  get isKeyFrame() {
    return this.allNalus.map(n => n[0] & 0x1f).filter(k => k === 5).length > 0
  }

  get hasConfig() {
    return this.allNalus.map(n => n[0] & 0x1f).filter(k => (k === 7) || (k === 8)).length > 0
  }

  get allNalus() {
    return this.nalus.map(n => n.nalu)
  }

  get length() {
    return this.allNalus.reduce((a, c) => a + (c.length+4), 0)
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

const unique = (arr) => {
  return arr.filter((val, idx, self) => {
    return self.indexOf(val) === idx
  })
}


export default ElementaryStream
