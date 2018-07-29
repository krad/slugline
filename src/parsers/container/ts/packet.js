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
    this.naluRanges   = parseNALUranges(this.data)
    this.nalus        = []
    // this.parse()
  }

  parse() {
    this.naluRanges.forEach(range => {
      const naluSize  = range.end - range.start
      const end       = range.end === undefined ? this.data.byteLength : range.end
      const view      = new DataView(this.data.buffer, range.start, range.end)
      switch (range.type) {
        case 7:
          this.nalus.push(new SPS(view))
          break
        case 8:
          this.nalus.push(new PPS(view))
          break
      }
    })
  }
}

const parseNALUranges = (dataView) => {
  let nalus = []
  for (var i = 0; i < dataView.byteLength; i++)  {
    if (i < dataView.byteLength - 4) {
      if(dataView.getUint8(i) === 0x00) {
        if (dataView.getUint8(i+1) === 0x00) {
          if (dataView.getUint8(i+2) === 0x00) {
            if (dataView.getUint8(i+3) === 0x01) {

              const lastNaluIdx = nalus.length-1
              let lastNalu = nalus[lastNaluIdx]
              if (lastNalu) {
                lastNalu.end = i-1
                nalus[lastNaluIdx] = lastNalu
              }

              let nalu    = {}
              nalu.start  = i+4
              nalu.type   = dataView.getUint8(i+4) & 0x1f
              nalus.push(nalu)
            }
          }
        }
      }
    }
  }

  if (nalus.length > 1) {
    let lastNalu = nalus[nalus.length-1]
  }

  return nalus
}

class SPS {
  constructor(dataView) {
    let startIdx = dataView.byteOffset
    console.log(dataView.getUint8(startIdx) & 0x1f);
  }
}

class PPS {
  constructor(dataView) {
    let startIdx = dataView.byteOffset
    console.log(dataView.getUint8(startIdx) & 0x1f);
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
