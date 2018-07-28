class PacketHeader {
  constructor(headerBytes) {
    this.data     = new DataView(headerBytes.buffer, 0, 4)
    this.syncByte = this.data.getUint8(0)

    let next      = this.data.getUint16(1)
    this.TEI      = next & 0x8000
    this.PUSI     = next & 0x4000
    this.PRIORITY = next & 0x2000
    this.PID      = next & 0x1fff

    next                        = this.data.getUint8(3)
    this.TSC                    = next & 0xc0
    this.AdaptationFieldControl = next & 0x30
    this.CountinuityCounter     = next & 0xf
    this.length                 = this.data.byteLength
  }
}

export default PacketHeader
