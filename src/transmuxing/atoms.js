import * as bytes from './byte-helpers'

export const ftyp = () => {
  return [
    bytes.strToUint8('ftyp'),
    bytes.strToUint8('mp42'),
    bytes.u32(1), // minor version
    ['mp41', 'mp42', 'isom', 'hlsf'].map(b => bytes.strToUint8(b))
  ]
}

export const moov = () => {
  return [
    bytes.strToUint8('moov')
  ]
}

export const mvhd = () => {
  return [
    btyes.strToUint8('mvhd')
  ]
}

export const trak = () => {
  return [
    bytes.strToUint8('trak')
  ]
}

export const build = (atom) => {
  const arr = atom.flatMap(y => y)
  const sum = (acc, curr) => { return acc + curr.length  }
  const size = arr.reduce(sum, 0) + 4
  arr.unshift(bytes.u32(size))
  const fullAtom = bytes.concatenate(Uint8Array, ...arr)
  return fullAtom
}
