class Packet {
  constructor(header, bitReader) {
    this.header = header
    this.data   = bitReader.data.slice((bitReader.currentBit()/8))
    this.length = bitReader.data.length
  }
}

class MediaPacket extends Packet {
  constructor(header, bitReader, streamType) {
    super(header, bitReader)
    this.streamType = streamType
  }

}

export { Packet, MediaPacket }
