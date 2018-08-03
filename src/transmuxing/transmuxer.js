import * as atoms from './atoms'

class Transmuxer {
  constructor(transportStream) {
    this.ts = transportStream
  }

  buildInitializationSegment() {
    let result = []
    result.push(atoms.build(atoms.ftyp()))
    result.push(atoms.build(atoms.moov()))
    return result.flatMap(a => a)
  }
}

export default Transmuxer
