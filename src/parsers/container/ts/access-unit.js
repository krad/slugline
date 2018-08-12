import * as bytes from '../../../helpers/byte-helpers'
import NALU from './nalu'

class AccessUnit {

  static parse(pes) {
    let result = {units: []}
    let itr    = bytes.elementaryStreamIterator(pes.packets, [0, 0, 1])
    let cnt = 0
    let accessUnit
    while (1) {
      let next = itr.next()
      if (next === undefined) { break }

      const nalu = new NALU(next)
      if (nalu.nal_unit_type === 9) {
        if (accessUnit) { result.units.push(accessUnit) }
        accessUnit = new AccessUnit(cnt)
        accessUnit.packet = itr.reader.currentPacket().header
        cnt += 1
        accessUnit.push(nalu)
      } else {
        if (accessUnit) { accessUnit.push(nalu) }
      }

      if (nalu.nal_unit_type === 7) {
        result.sps = nalu
        result.spsParsed = bytes.parseSPS(nalu.rbsp)
      }

      if (nalu.nal_unit_type === 8) {
        result.pps = nalu
      }

    }

    result.units.push(accessUnit)
    return result
  }

  constructor(id) {
    this.id    = id
    this.nalus = []
  }

  push(nalu) {
    this.nalus.push(nalu)
  }

  get dts() {
    if (this.packet) { return (this.packet.dts)}
    return undefined
  }

  get pts() {
    if (this.packet) { return (this.packet.pts)}
    return undefined
  }

  get isKeyFrame() {
    return this.nalus.filter(n => n.nal_unit_type === 5).length > 0
  }

  get hasConfig() {
    return this.nalus.filter(n => (n.nal_unit_type === 7) || (n.nal_unit_type === 8)).length > 0
  }

  get length() {
    return (this.nalus.reduce((a, c) => a + c.length, 0) + (this.nalus.length * 4))
  }

}

export default AccessUnit
