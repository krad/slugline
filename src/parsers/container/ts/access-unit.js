import * as bytes from '../../../helpers/byte-helpers'
import NALU from './nalu'

class AccessUnit {

  static parse(pes) {
    // console.log('ACCESS UNIT');
    let result = {units: [], streamType: 27, duration: 0, trackID: pes.trackID}
    let itr    = bytes.elementaryStreamIterator(pes.packets, [0, 0, 1])
    let cnt = 0
    let accessUnit
    while (1) {
      let next = itr.next()
      if (next === undefined) { break }

      const nalu = new NALU(next)
      if (nalu.nal_unit_type === 9) {

        let nextAccessUnit = new AccessUnit(cnt)
        nextAccessUnit.packet = itr.reader.currentPacket().header
        cnt += 1
        nextAccessUnit.push(nalu)

        if (accessUnit) {
          if (accessUnit.dts) {
            result.bFramesPresent = true /// NOP Sort afterwards
          } else {
            accessUnit.duration = nextAccessUnit.pts - accessUnit.pts
          }

          result.units.push(accessUnit)
        }

        accessUnit = nextAccessUnit

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

    // result.units.push(accessUnit)

    if (result.bFramesPresent) {
        let lastAccessUnit

        result.units.sort((a, b) => a.dts - b.dts)
        let dt = 0
        result.units.forEach(au => {
          if (lastAccessUnit) {
            lastAccessUnit.duration = (au.dts - lastAccessUnit.dts)
          }
          lastAccessUnit = au

          au.dt = dt
          dt += au.dts

        })
        // lastAccessUnit.duration = 0
        lastAccessUnit.duration  = result.units.slice(-2)[0].duration
        result.units.sort((a, b) => a.id - b.id)
    }


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

  get nalusWithoutConfig() {
    return this.nalus.filter(n => n.nal_unit_type !== 7 && n.nal_unit_type !== 8)
  }

  get lengthWithoutConfig() {
    return this.nalusWithoutConfig.reduce((a, c) => a + c.length, 0) + (this.nalusWithoutConfig.length * 4)
  }

  get frameType() {
    let nalu = this.nalus.filter(n => n.nal_unit_type === 1 || n.nal_unit_type === 5)[0]
    let r = new bytes.BitReader(nalu.payload)
    r.readBits(8)
    r.readExpGolomb()
    const sliceType = r.readExpGolomb()
    switch (sliceType) {
      case 0:  return 'P'
      case 1:  return 'B'
      case 2:  return 'I'
      case 3:  return 'SP'
      case 4:  return 'SI'
      case 5:  return 'P'
      case 6:  return 'B'
      case 7:  return 'I'
      case 8:  return 'SP'
      case 9:  return 'SI'
      default: return 'UNKNOWN'
    }
  }

}

export const keyframeIterator = (accessUnits) => {

  let currentIndex = 0

  return {
    next: () => {
      let result
      while (1) {
        let next = accessUnits[currentIndex]
        if (next === undefined) { break }
        if (result) {
          if (next.isKeyFrame) {
            return result
          } else {
            result.push(next)
          }
        } else {
          result = [next]
        }
        currentIndex++
      }
      return result
    }
  }
}


export default AccessUnit
