class AccessUnit {

  constructor(id) {
    this.id    = id
    this.nalus = []
  }

  push(nalu) {
    this.nalus.push(nalu)
  }

  appendToLast(bytes) {
    console.log('id', this.id);
    let last = this.nalus.pop()
    console.log(last.nalu.slice(0, 10));
    console.log(last.nalu.constructor.name);
    // console.log(last.packet);
    // console.log(last.nalu[0] & 0x1f);
    // console.log(last.nalu.length);
    last.nalu.push(...bytes)
    // console.log(last.nalu.length);
    this.push(last)
  }

  get lastNalu() {
    return this.nalus[this.nalus.length-1]
  }

  get pts() {
    if (this.packet) {
      return this.packet.pts
    }
    return undefined
  }

  get dts() {
    if (this.packet) {
      return this.packet.dts
    }
    return undefined
  }

  get duration() {
    let pcrBase = unique(this.nalus.filter(n => n.packet != undefined)
    .filter(p => p.packet.programPacketHeader != undefined)
    .filter(p => p.packet.programPacketHeader.adaptationField != undefined)
    .map(p => p.packet.programPacketHeader.adaptationField.pcrBase))[0]

    if (this.dts) { return this.dts }
    else { return this.pts }
  }

  get packet() {
    return this.nalus[0].packet
  }

  get isKeyFrame() {
    return this.allNalus.map(n => n[0] & 0x1f).filter(k => k === 5).length > 0
  }

  get hasConfig() {
    return this.allNalus.map(n => n[0] & 0x1f).filter(k => (k === 7) || (k === 8)).length > 0
  }

  get allNalus() {
    return this.nalus.map(n => n.nalu)
  }

  get length() {
    return this.allNalus.reduce((a, c) => a + (c.length+4), 0)
  }
}

const unique = (arr) => {
  return arr.filter((val, idx, self) => {
    return self.indexOf(val) === idx
  })
}

export AccessUnit
