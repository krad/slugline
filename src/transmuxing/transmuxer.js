import encoding from 'text-encoding'


class Transmuxer {
  constructor(transportStream) {
    this.encoder = new encoding.TextEncoder()
    this.ts = transportStream
  }

  buildInitializationSegment() {
    let atoms = []
    atoms.push(buildAtom(ftyp))
    return atoms.flatMap(a => a)
  }
}

const u32 = (lng) => {
  let arr = new Uint8Array(4)
  for (let i = 0; i < arr.length; i++) {
    let byte = lng & 0xff
    arr[i] = byte
    lng = (lng - byte) / 256
  }
  return arr
}

const strToUint8 = (str) => {
  const buf = new Uint8Array(str.length)
  for (var i = 0; i < str.length; i++) {
    buf[i] = str.charCodeAt(i) & 255
  }
  return buf
}

const ftyp = [
  strToUint8('ftyp'),
  strToUint8('mp42'),
  u32(1), // minor version
  ['mp41', 'mp42', 'isom', 'hlsf'].map(b => strToUint8(b))
]

const buildAtom = (atom) => {
  const arr = atom.flatMap(y => y)
  const sum = (acc, curr) => { return acc + curr.length  }

  const size = arr.reduce(sum, 0)
  arr.unshift(u32(size))

  return arr
}


export default Transmuxer
