import * as bytes from '../../../helpers/byte-helpers'

const isHeader = (arr) => {
  return arr[0] === 0xff && (arr[1] & 0xf6) === 0xf0
}

class ADTS {

  static parse(pes) {
    let result = {units: [], streamType: 15, duration: 0, trackID: pes.trackID}
    let reader = bytes.streamReader(pes.packets)
    let cnt = 0
    let first
    while (1) {
      if (reader.atEnd()) { break }
      const bit = reader.readBits(12)
      if (bit === 0b111111111111) {

        reader.rewind(12)
        let adts  = new ADTS(reader)
        const pes = reader.currentPacket()
        if (pes === undefined) { continue }
        if (pes) { adts.packet = pes.header }

        if (first) {
          if (first.header.samplingRate === adts.header.samplingRate) {
            adts.id = cnt++
            result.units.push(adts)
          } else {
            reader.rewind((adts.packetLength+adts.headerSize)*8)
            reader.readBit()
          }

        } else {
          first = adts
          adts.id = cnt++
          result.units.push(adts)
        }

      } else {
        reader.rewind(11)
      }
    }

    return result
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
  constructor(bitReader) {
    this.header = {}
    this.header.sync                      = bitReader.readBits(12)
    this.header.version                   = bitReader.readBit()
    this.header.layer                     = bitReader.readBits(2)
    this.header.protectionAbsent          = bitReader.readBit()
    this.header.profileMinusOne           = bitReader.readBits(2)
    this.header.samplingFreq              = bitReader.readBits(4)
    this.header.privateBit                = bitReader.readBit()
    this.header.channelConfig             = bitReader.readBits(3)
    this.header.originality               = bitReader.readBit()
    this.header.home                      = bitReader.readBit()
    this.header.copyrightID               = bitReader.readBit()
    this.header.copyrightIDStart          = bitReader.readBit()
    this.header.frameLength               = bitReader.readBits(13)
    this.header.bufferFullness            = bitReader.readBits(11)
    this.header.numberOfFramesMinusOne    = bitReader.readBits(2)
    this.header.samplingRate              = sampleRate(this.header.samplingFreq)
    this.header.channelConfigDescription  = channelConfigurations(this.header.channelConfig)

    if (!this.header.protectionAbsent) {
      this.header.crc = bitReader.readBits(16)
    }

    this.payload = []
    while (!this.isFull) {
      this.payload.push(bitReader.readBits(8))
    }

  }

  get headerSize() {
    return this.header.protectionAbsent === 1 ? 7 : 9
  }

  get packetLength() {
    let frameLength = (this.header.frameLength) * (this.header.numberOfFramesMinusOne + 1)
    frameLength -= this.headerSize
    return frameLength
  }

  get isFull() {
    if (this.payload.length !== this.packetLength) {
      return false
    }
    return true
  }

  get length() {
    return this.payload.length
  }

  get duration() {
    return (this.header.numberOfFramesMinusOne+1) * 1024
  }
}

const sampleRate = (sampleFreq) => {
  switch (sampleFreq) {
    case 0:
      return 96000
    case 1:
      return 88200
    case 2:
      return 64000
    case 3:
      return 48000
    case 4:
      return 44100
    case 5:
      return 32000
    case 6:
      return 24000
    case 7:
      return 22050
    case 8:
      return 16000
    case 9:
      return 12000
    case 10:
      return 11025
    case 11:
      return 8000
    case 12:
      return 7350
    case 13:
    case 14:
      return 'RESERVED'
    case 15:
      return 'FORBIDDEN'
  }
}

const channelConfigurations = (config) => {
  switch (config) {
    case 0:
      return 'AOT Specific Config'
    case 1:
      return '1 channel: front-center'
    case 2:
      return '2 channels: front-left, front-right'
    case 3:
      return '3 channels: front-center, front-left, front-right'
    case 4:
      return '4 channels: front-center, front-leg, front-right, back-center'
    case 5:
      return '5 channels: front-center, front-left, front-right, back-left, back-right'
    case 6:
      return '6 channels: front-center, front-left, front-right, back-left, back-right, LFE-channel'
    case 7:
      return '8 channels: front-center, front-left, front-right, side-left, side-right, back-left, back-right, LFE-channel'
    case 8:
    case 9:
    case 10:
    case 11:
    case 12:
    case 13:
    case 14:
    case 15:
      return 'RESERVED'
  }
}

export const durationIterator = (packets) => {
  let currentIdx = 0

  return {
    next: (lastTS) => {
      let result = []
      for (var i = currentIdx; i < packets.length; i++) {
        const p = packets[i]
        if (p.packet.pts <= lastTS) {
          result.push(p)
          currentIdx++
        }
      }
      return result
    }
  }
}

export default ADTS
