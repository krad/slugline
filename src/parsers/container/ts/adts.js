import * as bytes from '../../../helpers/byte-helpers'

class ADTS {

  static parse(pes) {
    let result = {units: [], streamType: 15, duration: 0, trackID: pes.trackID}
    let r = bytes.streamReader(pes.packets)
    let last
    while (1) {
      let next = r.readBits(12)
      if (next === undefined) { break }
      if (next === 0xfff) {
        let pkt = new ADTS(r)
        let pes = r.currentPacket()
        if (pes) { pkt.packet = pes.header }

        last = result.units.slice(-1)[0]
        if (last) {
          if (pkt.header.samplingFreq === last.header.samplingFreq) {
            result.units.push(pkt)
          }
        } else {
          result.units.push(pkt)
        }

      }
    }
    return result
  }

  constructor(bitReader) {
    this.header = {}
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

    const headerSize  = this.header.protectionAbsent === 1 ? 7 : 9
    const bytesToRead = ((this.header.frameLength) * (this.header.numberOfFramesMinusOne+1)) - headerSize
    this.payload      = []

    let cnt = 0
    while (cnt < bytesToRead) {
      this.payload.push(bitReader.readBits(8))
      cnt += 1
    }
  }

  get length() {
    return this.payload.length
  }

  get duration() {
    return 1024
    // const numberOfFrames = this.header.numberOfFramesMinusOne + 1
    // return (1000 / this.header.samplingRate) * (1024 * numberOfFrames)
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

export default ADTS
