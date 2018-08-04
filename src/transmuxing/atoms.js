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
    [stbl(config)], // sample table atom
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

export const stbl = (config) => {
  return [
    bytes.strToUint8('stbl'),
    [stsd(config)],             // sample description atom
    [stts(config)],             // time to sample atom
    [stsc(config)],             // sample to chunk atom
    [stsz(config)],             // sample size atom
    [stco(config)],             // chunk offset atom
  ]
}

export const stsd = (config) => {
  return [
    bytes.strToUint8('stsd'),
    new Uint8Array(1),         // version
    new Uint8Array([0, 0, 0]), // flags
    bytes.u32(1),              // number of entries
    [avc1(config)],
    [mp4a(config)],
  ]
}

export const stts = (config) => {
  return [
    bytes.strToUint8('stts'),
    new Uint8Array(1),         // version
    new Uint8Array([0, 0, 0]), // flags
    bytes.u32(1),              // number of entries
  ]
}

export const avc1 = (config) => {
  return [
    bytes.strToUint8('avc1'),
    new Uint8Array(6),         // reserved
    bytes.u16(1),              // data reference index
    bytes.u16(0),              // version
    bytes.u16(0),              // revision level
    bytes.u32(0),              // vendor
    bytes.u32(0),              // temporal quality
    bytes.u32(0),              // spatial quality
    bytes.u16(1281),           // width
    bytes.u16(721),            // height
    bytes.u32(4718592),        // horizontal resolution
    bytes.u32(4718592),        // vertical resolution
    bytes.u32(0),              // data size
    bytes.u16(1),              // frame count
    new Uint8Array(1),         // compressorName size
    new Uint8Array(31),        // padding
    bytes.s16(24),             // depth
    bytes.s16(-1),             // color table id
    [avcC(config)],
    [colr(config)],
    [pasp(config)],
  ]
}

export const avcC = (config) => {
  return [
    bytes.strToUint8('avcC'),
    new Uint8Array([1]),                  // version
    new Uint8Array([0x42]),               // profile
    new Uint8Array([0]),                  // profile compatibility
    new Uint8Array([30]),                 // level indication
    new Uint8Array([0b11111111]),         // nalu size
    new UInt8Array([0b11100001]),         // sps count
    bytes.u16(27),                        // sps length
    new Uint8Array([0x27, 0x4d, 0x00, 0x1f, 0x89, 0x8b,
    0x60, 0x28, 0x02, 0xdd, 0x80, 0xb5,
    0x01, 0x01, 0x01, 0xec, 0x0c, 0x00,
    0x17, 0x70, 0x00, 0x05, 0xdc, 0x17,
    0xbd, 0xf0, 0x50]),                       // sps bytes
    new Uint8Array([1]),                      // pps count
    bytes.u16(4),                             // pps length
    new Uint8Array([0x28, 0xee, 0x1f, 0x20]), // pps bytes
  ]
}

export const colr = (config) => {
  return [
    bytes.strToUint8('colr'),
    bytes.strToUint8('nclx'),     // color parameter
    bytes.u16(1),                 // primaries index
    btyes.u16(1),                 // transfer function index
    bytes.u16(1),                 // matrix index
    new Uint8Array(1),            // unknown
  ]
}

//    4:3 square pixels (composite NTSC or PAL) hSpacing: 1 vSpacing: 1
//    4:3 non-square 525 (NTSC) hSpacing: 10 vSpacing: 11
//    4:3 non-square 625 (PAL) hSpacing: 59 vSpacing: 54
//    16:9 analog (composite NTSC or PAL) hSpacing: 4 vSpacing: 3
//    16:9 digital 525 (NTSC) hSpacing: 40 vSpacing: 33
//    16:9 digital 625 (PAL) hSpacing: 118 vSpacing: 81
//    1920x1035 HDTV (per SMPTE 260M-1992) hSpacing: 113 vSpacing: 118
//    1920x1035 HDTV (per SMPTE RP 187-1995) hSpacing: 1018 vSpacing: 1062
//    1920x1080 HDTV or 1280x720 HDTV hSpacing: 1 vSpacing: 1
export const pasp = (config) => {
  return [
    bytes.strToUint8('pasp'),
    bytes.u32(1),             // horizontal spacing
    bytes.u32(1),             // vertical spacing
  ]
}

export const mp4a = (config) => {
  return [
    bytes.strToUint8('mp4a'),
    new Uint8Array(6),        // reserved
    bytes.u16(1),             // data ref index
    bytes.u64(0),             // reserved
    bytes.u16(2),             // channels
    bytes.u16(16),            // sample size
    bytes.u16(0),             // predefined
    bytes.u16(0),             // reserved
    bytes.u32(44100),         // sample rate
    [esds(config)]
  ]
}

export const esds = (config) => {
  return [
    bytes.strToUint8('esds'),
    new Uint8Array(1),                        // version
    new Uint8Array(3),                        // flags
    new Uint8Array([0x03]),                   // es desc type tag
    new Uint8Array([0x80, 0x80, 0x80]),       // 0x80 = start & 0xfe = end
    new Uint8Array([0x22]),                   // es desc length
    bytes.u16(0),                             // es id
    new Uint8Array(1),                        // stream priority
    new Uint8Array([0x04]),                   // decoder config desc tag
    new Uint8Array([0x80, 0x80, 0x80]),       // 0x80 = start & 0xfe = end
    new Uint8Array([0x14]),                   // es ext desc length
    new Uint8Array([0x40]),                   // object profile indication audio == 64
    new Uint8Array([0x15]),                   // stream type
    new Uint8Array([0x00, 0x18, 0x00]),       // buffer size DB
    bytes.u32(0),                             // max bit rate
    bytes.u32(0),                             // avg bit rate
    new Uint8Array([0x05]),                   // decoder specific info tag
    new Uint8Array([0x80, 0x80, 0x80]),       // 0x80 = start & 0xfe = end
    new UInt8Array([0x02]),                   // desc length
    new Uint8Array([0x12, 0x10]),             // audio specific config
    new Uint8Array([0x06, 0x80, 0x80, 0x80]), // es ext desc tag
    new Uint8Array([0x01]),                   // sl config len
    new Uint8Array([0x02]),                   // slmp4const
  ]
}

export const stsc = (config) => {
  return [
    bytes.strToUint8('stsc'),
    new Uint8Array(1),         // version
    new Uint8Array(3),         // flags
    bytes.u32(0),              // number of entries
  ]
}

export const stsz = (config) => {
  return [
    bytes.strToUint8('stsz'),
    new Uint8Array(1),         // version
    new Uint8Array(3),         // flags
    s.u32(0),                  // sample size
    s.u32(0),                  // number of entries
  ]
}

export const stco = (config) => {
  return [
    bytes.strToUint8('stco'),
    new Uint8Array(1),         // version
    new Uint8Array(3),         // flags
    s.u32(0),                  // number of entries
  ]
}

export const mvex = (config) => {
  return [
    bytes.strToUint8('mvex'),
    [trex(config)]              // track ex atom
  ]
}

export const trex = (config) => {
  return [
    bytes.strToUint8('trex'),
    new Uint8Array(1),         // version
    new Uint8Array(3),         // flags
    bytes.u32(1),              // track id
    bytes.u32(1),              // sample description index
    bytes.u32(0),              // sample duration
    bytes.u32(0),              // sample size
    bytes.u32(0x02000000)      // sample flags
  ]
}

export const flatten = (atom) => {
  return atom.flatMap(a => a)
}

export const prependSize = (atom, padding) => {
  const arr   = flatten(atom)
  const sum   = (acc, curr) => { return acc + curr.length  }
  let size  = arr.reduce(sum, 0) + 4
  if (padding) { size += padding }
  arr.unshift(bytes.u32(size))
  return arr
}

export const prepare = (atom) => {
  let result = []
  const reversed = atom.reverse()
  for (var i = 0; i < reversed.length; i++) {
    const child = reversed[i]
    if (child.constructor.name === 'Array') {
      result.unshift(prependSize(child))
    }

    if (child.constructor.name === 'Uint8Array') {
      const prevChild = result[i-1]
      if (prevChild) {
        const sizeView = new DataView(prevChild[0].buffer)
        result.unshift(prependSize([child], sizeView.getUint32(0)))
      } else {
        result.unshift(prependSize([child]))
      }
    }
  }
  atom.reverse() // reverse mutates :(
  return result
}

export const build = (atom) => {
  const preparedAtom  = prepare(atom)
  const flattened     = flatten(preparedAtom)
  const fullAtom      = bytes.concatenate(Uint8Array, ...flattened)
  return fullAtom
}
