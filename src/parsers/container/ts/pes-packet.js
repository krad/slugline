export class PESPacket {

  constructor(streamID, reader, cntID) {
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
      pts = (pts << 3) | low
      pts = (pts << 15) | mid
      pts = ((pts << 15) | high) >>> 0

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
      pts = (pts << 3) | low
      pts = (pts << 15) | mid
      pts = ((pts << 15) | high) >>> 0
      this.header.pts = pts

      reader.readBits(4)
      high = reader.readBits(3)
      reader.readBit()
      mid = reader.readBits(15)
      reader.readBit()
      low = reader.readBits(15)
      reader.readBit()

      let dts = 0
      dts = (dts << 3) | low
      dts = (dts << 15) | mid
      dts = ((dts << 15) | high) >>> 0
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

export default PESPacket
