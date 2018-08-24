import * as bytes from '../../../helpers/byte-helpers'

class NALU {

  constructor(payload) {
    this.objType       = 'NALU'
    const reader       = new bytes.BitReader(payload)
    this.forbidden_bit = reader.readBit()
    this.nal_ref_idc   = reader.readBits(2)
    this.nal_unit_type = reader.readBits(5)
    this.payload       = payload
  }

  get rbsp() {
    return buildRBSP(this.payload)
  }

  get length() {
    return this.rbsp.length
  }
}

export const buildRBSP = (payload) => {
  let result   = []
  const reader = new bytes.BitReader(payload)
  while (!reader.atEnd()) {
    let byte = reader.readBits(8)
    result.push(byte)

    if (bytes.equal(result.slice(-3), [0, 0, 3])) {
      result = result.slice(0, -3)
      reader.rewind(24)
      result.push(reader.readBits(8))
      result.push(reader.readBits(8))
      reader.readBits(8) /// emulation byte
      result.push(reader.readBits(8))
    }

  }
  return result
}

export default NALU
