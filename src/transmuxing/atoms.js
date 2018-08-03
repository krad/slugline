import * as bytes from './byte-helpers'

export const ftyp = () => {
  return [
    bytes.strToUint8('ftyp'),
    bytes.strToUint8('mp42'),
    bytes.u32(1), // minor version
    ['mp41', 'mp42', 'isom', 'hlsf'].map(b => bytes.strToUint8(b))
  ]
}

export const moov = (config) => {
  return [
    bytes.strToUint8('moov'),
    mvhd(config)
  ]
}

export const mvhd = (config) => {
  return [
    bytes.strToUint8('mvhd'),
    new Uint8Array(1),      // version
    new Uint8Array(3),      // flags
    bytes.u32(3592932068),  // creation time     // FIXME
    bytes.u32(3592932068),  // modification time // FIXME
    bytes.u32(30),          // timescale         // FIXME
    bytes.u32(0),           // duration          // FIXME
    bytes.u32(65536),       // prefered rate     // FIXME
    bytes.s16(0),           // prefered volume
    new Uint8Array(10),     // reserved
    new Uint8Array(36),     // matrix struct // FIXME
    bytes.u32(0),           // preview time
    bytes.u32(0),           // preview duration
    bytes.u32(0),           // posterTime
    bytes.u32(0),           // selectionTime
    bytes.u32(0),           // selectionDuration
    bytes.u32(0),           // currentTime
    bytes.u32(2),           // nextTrackID
  ]
}

export const trak = (config) => {
  return [
    bytes.strToUint8('trak')
    [tkhd(config)],
    [mdia(config)],
  ]
}

export const tkhd = (config) => {
  return [
    bytes.strToUint8('tkhd'),
    new Uint8Array(1),          // version
    new Uint8Array([0, 0, 1]),  // flags
    bytes.u32(3592932068),      // creation time // FIXME
    bytes.u32(3592932068),      // modification time // FIXME
    bytes.u32(2),               // track id
    bytes.u32(0),               // reserved
    bytes.u32(0),               // duration
    bytes.u64(0),               // reserved
    bytes.u16(0),               // layer
    bytes.u16(0),               // alternate group
    bytes.u16(0),               // volume
    bytes.u16(0),               // reserved
    new Uint8Array(36),         // matrix struct // FIXME
    bytes.u32(1980),            // track width
    bytes.u32(720),             // track height
  ]
}

export const mdia = (config) => {
  return [
    bytes.strToUint8('mdia')
    [mdhd(config)],
    [hdlr(config)],
  ]
}

export const mdhd = (config) => {
  return [
    bytes.strToUint8('mdhd'),
    new Uint8Array(1),          // version
    new Uint8Array([0, 0, 0]),  // flags
    bytes.u32(3592932068),      // creationTime // FIXME
    bytes.u32(3592932068),      // modification time // FIXME
    bytes.u32(30000),           // timescale
    bytes.u32(0),               // duration
    bytes.u16(0),               // language // FIXME
    bytes.u16(0),               // quality
  ]
}

export const hdlr = (config) => {
  return [
    bytes.strToUint8('hdlr'),
    new Uint8Array(1),          // version
    new Uint8Array([0, 0, 0]),  // flags
    bytes.u32(0),               // componentType
    bytes.strToUint8('vide'),   // componentSubtype
    bytes.u32(0),               // component manufacturer
    bytes.u32(0),               // component flags
    bytes.u32(0),               // component flag mask
    bytes.strToUint8('krad.tv - slugline\0') // component name
  ]
}

export const minf = (config) => {
  return [
    bytes.strToUint8('minf'),
    [vmhd(config)], // video media information atom
    [smhd(config)], // sound media information atom
    [dinf(config)], // data information atom

  ]
}

export const vmhd = (config) => {
  return [
    bytes.strToUint8('vmhd'),
    new Uint8Array(1),                          // version
    new Uint8Array([0, 0, 1]),                  // flags
    bytes.u16(0),                               // graphics mode
    [bytes.u16(0), bytes.u16(0), bytes.u16(0)]  // op color
  ]
}

export const smhd = (config) => {
  return [
    bytes.strToUint8('smhd'),
    new Uint8Array(1),         // version
    new Uint8Array([0, 0, 0]), // flags
    bytes.u16(0),              // balance
    bytes.u16(0),              // reserved
  ]
}

export const dinf = (config) => {
  return [
    bytes.strToUint8('dinf'),
    [dref(config)],
  ]
}

export const dref = (config) => {
  return [
    bytes.strToUint8('dref'),
    new Uint8Array(1),         // version
    new Uint8Array([0, 0, 0]), // flags
    bytes.u32(1),              // number of entries
    [dreference(config)]
  ]
}

export const dreference = (config) => {
  return [
    bytes.strToUint8('url '),
    new Uint8Array(1),        // version
    new Uint8Array([0, 0, 1]) // flags
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
