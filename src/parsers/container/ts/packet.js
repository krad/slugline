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
    this.streamType = streamType
  }
}

/// FIXME: Use this.
const isBigEndianSystem = () => {
  let buffer  = new ArrayBuffer(2)
  let array   = new Uint8Array(buffer)
  let array16 = new Uint16Array(buffer)
  array[0] = 0xAA
  array[1] = 0xBB
  if (array16[0] === 0xBBAA) { return false }
  if (array16[1] === 0xAABB) { return true }
  throw new Error("Something wrong with system memory.  Can't determine endianness")
}

export { Packet, MediaPacket }
