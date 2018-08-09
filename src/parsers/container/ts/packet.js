class Packet {
  constructor(header, bitReader) {
    this.header = header
    this.data   = bitReader.data
    this.length = this.data.length
  }
}

class MediaPacket extends Packet {
  constructor(header, bitReader, streamType) {
    super(header, bitReader)
    this.streamType = streamType
  }

}

export { Packet, MediaPacket }
