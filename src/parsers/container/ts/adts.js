import * as bytes from '../../../helpers/byte-helpers'

class ADTS {

  static parse(pes) {
    let result = {units: []}
    let r = bytes.streamReader(pes.packets)
    while (1) {
      let next = r.readBits(12)
      if (next === undefined) { break }
      if (next === 0xfff) {
        let pkt = new ADTS(r)
        let pes = r.currentPacket()
        if (pes) { pkt.packet = pes.header }

        let last = result.units.slice(-1)[0]
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
    this.header.version                = bitReader.readBit()
    this.header.layer                  = bitReader.readBits(2)
    this.header.protectionAbsent       = bitReader.readBit()
    this.header.profileMinusOne        = bitReader.readBits(2)
    this.header.samplingFreq           = bitReader.readBits(4)
    this.header.privateBit             = bitReader.readBit()
    this.header.channelConfig          = bitReader.readBits(3)
    this.header.originality            = bitReader.readBit()
    this.header.home                   = bitReader.readBit()
    this.header.copyrightID            = bitReader.readBit()
    this.header.copyrightIDStart       = bitReader.readBit()
    this.header.frameLength            = bitReader.readBits(13)
    this.header.bufferFullness         = bitReader.readBits(11)
    this.header.numberOfFramesMinusOne = bitReader.readBits(2)


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
}

export default ADTS
