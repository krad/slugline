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
    this.nalus      = []
  }

  parse() {
    for (var i = 0; i < this.data.byteLength; i++)  {
      if (i < this.data.byteLength - 4) {
        if(this.data.getUint8(i) === 0x00) {
          if (this.data.getUint8(i+1) === 0x00) {
            if (this.data.getUint8(i+2) === 0x00) {
              if (this.data.getUint8(i+3) === 0x01) {

                const lastNaluIdx = this.nalus.length-1
                let lastNalu = this.nalus[lastNaluIdx]
                if (lastNalu) {
                  lastNalu.end = i-1
                  this.nalus[lastNaluIdx] = lastNalu
                }

                let nalu    = {}
                nalu.start  = i+4
                nalu.type   = this.data.getUint8(i+4) & 0x1f
                this.nalus.push(nalu)
              }
            }
          }
        }
      }
    }
  }
}

class SPS {
  constructor(bytes) {
    console.log(bytes);
  }
}

class PPS {
  constructor(bytes) {

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
