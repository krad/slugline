class Packet {
  constructor(header, dataView) {
    this.header = header
    this.data   = dataView
    this.length = header.length + dataView.byteLength
  }
}

class MediaPacket extends Packet {
  constructor(header, dataView, streamType) {
    super(header, dataView)
    this.streamType   = streamType
  }

}

export { Packet, MediaPacket }
