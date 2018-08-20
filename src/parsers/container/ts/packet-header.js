class PacketHeader {
  constructor(bitReader) {
    this.syncByte               = bitReader.readBits(8)
    this.TEI                    = bitReader.readBit()
    this.PUSI                   = bitReader.readBit()
    this.PRIORITY               = bitReader.readBit()
    this.PID                    = bitReader.readBits(13)
    this.TSC                    = bitReader.readBits(2)
    this.AdaptationFieldControl = bitReader.readBits(2)
    this.ContinuityCounter      = bitReader.readBits(4)
    this.length                 = 4

    // 01 – no adaptation field, payload only,
    // 10 – adaptation field only, no payload,
    // 11 – adaptation field followed by payload,
    // 00 - RESERVED for future use [9]
    switch (this.AdaptationFieldControl) {
      case 0b01:
        break
      case 0b10:
      case 0b11:
        this.adaptationField = new AdaptationField(bitReader)
        this.length += this.adaptationField.length
      case 0b00:
        break
        // console.log('reserved');
    }

  }
}

class AdaptationField {
  constructor(bitReader) {
    this.length                 = bitReader.readBits(8)
    this.discontinuityIndicator = bitReader.readBit()
    this.randomAccessIndicator  = bitReader.readBit()
    this.esProfileIndicator     = bitReader.readBit()
    this.pcrFlag                = bitReader.readBit()
    this.opcrFlag               = bitReader.readBit()
    this.splicingPointFlag      = bitReader.readBit()
    this.transportPrivateFlag   = bitReader.readBit()
    this.adaptationFieldExtFlag = bitReader.readBit()

    if (this.pcrFlag) {
      this.pcrBase  = bitReader.readBits(33)
      this.pcrConst = bitReader.readBits(6)
      this.pcrExt   = bitReader.readBits(9)
    }
    if (this.opcrFlag) { this.opcr = bitReader.readBit(48) }
    if (this.splicingPointFlag) { this.spliceCountdown = bitReader.readBits(8) }
    if (this.transportPrivateFlag) {
      this.transportPrivateDataLength = bitReader.readBits(8)
      this.transportPrivateData       = bitReader.readBits(this.transportPrivateDataLength * 8)
    }

    if (this.adaptationFieldExtFlag) {
      this.adaptionFieldExt = new AdaptationFieldExtension(bitReader)
      this.length += this.adaptionFieldExt.length
    }

    // while (1) {
    //   if (bitReader.atEnd()) { break }
    //   const byte = bitReader.readBits(8)
    //   if (byte === undefined) { break }
    //   if (byte !== 0xff) {
    //     bitReader.rewind(8)
    //     break
    //   }
    // }

  }
}

class AdaptationFieldExtension {
  constructor(bitReader) {
    this.length             = bitReader.readBits(8)
    this.ltwFlag            = bitReader.readBit()
    this.piecewiseRateFlag  = bitReader.readBit()
    this.seamlessSpliceFlag = bitReader.readBit()
    bitReader.readBits(5) // reserved

    if (this.ltwFlag) {
      this.ltwValidFlag = bitReader.readBit()
      this.ltwOffset    = bitReader.readBits(15)
    }

    if (this.piecewiseRateFlag) {
      bitReader.readBits(2) // reserved
      this.piecewiseRate = bitReader.readBits(22)
    }

    if (this.seamlessSpliceFlag) {
      this.spliceType         = bitReader.readBits(4)
      this.dtsNextAccessUnit  = bitReader.readBits(36)
    }
  }
}

export default PacketHeader
