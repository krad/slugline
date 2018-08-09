import * as bytes from '../helpers/byte-helpers'

//////////////////////////////////////////////////////////////////
//#pragma - Initialization Section Atoms
//////////////////////////////////////////////////////////////////

export const ftyp = () => {
  return [
    bytes.strToUint8('ftyp'),
    bytes.strToUint8('mp42'),
    bytes.u32(1), // minor version

    bytes.strToUint8('mp41'),
    bytes.strToUint8('mp42'),
    bytes.strToUint8('isom'),
    bytes.strToUint8('hlsf')
  ]
}

export const moov = (config) => {
  let result = [bytes.strToUint8('moov')]
  // let tracks = config.map(c => trak(c))

  let tracks = [trak(config[0])]

  return [
    bytes.strToUint8('moov'),
    mvhd(config),             // movie header atom
    ...tracks,             // tracks
    mvex(config),             // mvex atom
  ]
}

export const mvhd = (config) => {
  return [
    bytes.strToUint8('mvhd'),
    new Uint8Array(1),      // version
    new Uint8Array(3),      // flags
    bytes.u32(0),           // creation time     // FIXME
    bytes.u32(0),           // modification time // FIXME
    bytes.u32(90000),       // timescale         // FIXME
    bytes.u32(0),           // duration          // FIXME
    bytes.u32(0x00010000),  // prefered rate     // FIXME
    bytes.s16(0x0100),      // prefered volume
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
    bytes.strToUint8('trak'),
    tkhd(config),
    mdia(config),
  ]
}

export const tkhd = (config) => {
  let width  = 0
  let height = 0
  if (config.type === 27) {
    if (config.sps) {
      width   = config.sps.width
      height  = config.sps.height
    }
  }

  const matrix = [0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                  0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                  0x64, 0x00, 0x00, 0x00]

  let result = [
    bytes.strToUint8('tkhd'),
    new Uint8Array([0]),                 // version
    new Uint8Array([0x00, 0x00, 0x01]),  // flags
    bytes.u32(0),               // creation time // FIXME
    bytes.u32(0),               // modification time // FIXME
    bytes.u32(config.id),                // track id
    bytes.u32(0),                        // reserved
    bytes.u32(0),                        // duration
    bytes.u64(0),                        // reserved
    bytes.u16(0),                        // layer
    bytes.u16(0),                        // alternate group
    bytes.u16(0),                        // volume
    bytes.u16(0),                        // reserved
    new Uint8Array(matrix),              // matrix struct
    new Uint8Array([(width >> 8) & 0xff, (width & 0xff), 0x00, 0x00]),
    new Uint8Array([(height >> 8) & 0xff, (height & 0xff), 0x00, 0x00]),
    // bytes.u32(width),                    // track width
    // bytes.u32(height),                   // track height
  ]

  // (width >> 8) & 0xFF,
  //    width & 0xFF,
  //    0x00, 0x00, // width
  //    (height >> 8) & 0xFF,
  //    height & 0xFF,
  //    0x00, 0x00 // height

  return result
}

export const mdia = (config) => {
  return [
    bytes.strToUint8('mdia'),
    mdhd(config),
    hdlr(config),
    minf(config),
  ]
}

export const mdhd = (config) => {
  return [
    bytes.strToUint8('mdhd'),
    new Uint8Array(1),          // version
    new Uint8Array([0, 0, 0]),  // flags
    bytes.u32(0),      // creationTime // FIXME
    bytes.u32(0),      // modification time // FIXME
    bytes.u32(90000),           // timescale
    bytes.u32(0),               // duration
    bytes.u16(0),               // language // FIXME
    bytes.u16(0),               // quality
  ]
}

export const hdlr = (config) => {
  let componentName = 'krad - slugline\0'
  let componentSubtype
  if (config.type === 27) {
    componentName     = 'krad - slugline - video\0'
    componentSubtype  = 'vide'
  }

  if (config.type === 15) {
    componentName = 'krad - slugline - audio\0'
    componentSubtype = 'soun'
  }

  return [
    bytes.strToUint8('hdlr'),
    new Uint8Array(1),                  // version
    new Uint8Array([0, 0, 0]),          // flags
    bytes.u32(0),                       // componentType
    bytes.strToUint8(componentSubtype), // componentSubtype
    bytes.u32(0),                       // component manufacturer
    bytes.u32(0),                       // component flags
    bytes.u32(0),                       // component flag mask
    bytes.strToUint8(componentName)     // component name
  ]
}

export const minf = (config) => {
  let result = [bytes.strToUint8('minf')]

  if (config.type === 27) {
    result.push(vmhd(config)) // video media information atom
  }

  if (config.type === 15) {
    result.push(smhd(config)) // sound media information atom
  }

  result.push(dinf(config)) // data information atom
  result.push(stbl(config)) // sample table atom

  return result
}

export const vmhd = (config) => {
  return [
    bytes.strToUint8('vmhd'),
    new Uint8Array(1),                          // version
    new Uint8Array([0, 0, 1]),                  // flags
    bytes.u16(0),                               // graphics mode
    bytes.u16(0),                               // op color
    bytes.u16(0),                               // op color
    bytes.u16(0),                               // op color
  ]
}

export const smhd = (config) => {
  return [
    bytes.strToUint8('smhd'),
    new Uint8Array(1),         // version
    new Uint8Array([0, 0, 1]), // flags
    bytes.u16(0),              // balance
    bytes.u16(0),              // reserved
  ]
}

export const dinf = (config) => {
  return [
    bytes.strToUint8('dinf'),
    dref(config),
  ]
}

export const dref = (config) => {
  return [
    bytes.strToUint8('dref'),
    new Uint8Array(1),         // version
    new Uint8Array([0, 0, 0]), // flags
    bytes.u32(1),              // number of entries
    dreference(config)
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
    stsd(config),             // sample description atom
    // stts(config),             // time to sample atom
    // stsc(config),             // sample to chunk atom
    // stsz(config),             // sample size atom
    // stco(config),             // chunk offset atom
  ]
}

export const stsd = (config) => {
  let result = [
    bytes.strToUint8('stsd'),
    new Uint8Array(1),         // version
    new Uint8Array([0, 0, 0]), // flags
    bytes.u32(1),              // number of entries
  ]

  if (config.type === 27) {
    result.push(avc1(config))
  }

  if (config.type === 15) {
    result.push(mp4a(config))
  }

  return result
}

export const stts = (config) => {
  return [
    bytes.strToUint8('stts'),
    new Uint8Array(1),         // version
    new Uint8Array([0, 0, 0]), // flags
    bytes.u32(0),              // number of entries
  ]
}

export const avc1 = (config) => {

  let width  = 0
  let height = 0
  if (config.type === 27) {
    if (config.sps) {
      width   = config.sps.width
      height  = config.sps.height
    }
  }

  return [
    bytes.strToUint8('avc1'),
    new Uint8Array([0, 0, 0, 0, 0, 0]),         // reserved
    bytes.u16(1),              // data reference index
    bytes.u16(0),              // version
    bytes.u16(0),              // revision level
    bytes.u32(0),              // vendor
    bytes.u32(0),              // temporal quality
    bytes.u32(0),              // spatial quality
    bytes.u16(width),          // width
    bytes.u16(height),         // height
    bytes.u32(4718592),        // horizontal resolution
    bytes.u32(4718592),        // vertical resolution
    bytes.u32(0),              // data size
    bytes.u16(1),              // frame count
    new Uint8Array([0]),         // compressorName size
    new Uint8Array(31),        // padding
    bytes.s16(16),             // depth
    bytes.s16(-1),             // color table id
    avcC(config),
    colr(config),
    pasp(config),
  ]
}

export const avcC = (config) => {
  console.log(config);
  const sps = config.codec[0]
  const pps = config.codec[1]
  return [
    bytes.strToUint8('avcC'),
    new Uint8Array([1]),          // version
    new Uint8Array([sps[1]]),     // profile
    new Uint8Array([sps[2]]),     // profile compatibility
    new Uint8Array([sps[3]]),     // level indication
    new Uint8Array([0b11111111]), // nalu size minus 1 (5 bits reserved all one - 3 bits)
    new Uint8Array([1]),          // sps count
    bytes.u16(sps.length),        // sps length
    new Uint8Array(sps),          // sps bytes
    new Uint8Array([1]),          // pps count
    bytes.u16(pps.length),        // pps length
    new Uint8Array(pps),          // pps bytes
  ]
}

export const colr = (config) => {
  return [
    bytes.strToUint8('colr'),
    bytes.strToUint8('nclx'),     // color parameter
    bytes.u16(1),                 // primaries index
    bytes.u16(1),                 // transfer function index
    bytes.u16(0),                 // matrix index
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
    esds(config)
  ]
}

export const esds = (config) => {
  return [
    bytes.strToUint8('esds'),
    new Uint8Array([0]),                      // version
    new Uint8Array([0, 0, 0]),                // flags
    new Uint8Array([0x03]),                   // es desc type tag
    new Uint8Array([0x80, 0x80, 0x80]),       // 0x80 = start & 0xfe = end
    new Uint8Array([0x22]),                   // es desc length
    bytes.u16(0),                             // es id
    new Uint8Array([0]),                        // stream priority
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
    new Uint8Array([0x02]),                   // desc length
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
    bytes.u32(0),                  // sample size
    bytes.u32(0),                  // number of entries
  ]
}

export const stco = (config) => {
  return [
    bytes.strToUint8('stco'),
    new Uint8Array(1),         // version
    new Uint8Array(3),         // flags
    bytes.u32(0),                  // number of entries
  ]
}

export const mvex = (config) => {
  // const trexs = config.map(c => trex(c))
  const trexs = [trex(config[0])]

  return [
    bytes.strToUint8('mvex'),
    ...trexs                  // track ex atoms (1 per track)
  ]
}

export const trex = (config) => {
  let result =  [
    bytes.strToUint8('trex'),
    new Uint8Array(1),         // version
    new Uint8Array(3),         // flags
    bytes.u32(config.id),      // track id
    bytes.u32(1),              // sample description index
    bytes.u32(0),              // sample duration
    bytes.u32(0),              // sample size
  ]

  // If it's a video track, include sample flags
  if (config.type === 27) {
    result.push(bytes.u32(0x02000000))      // sample flags
  }

  if (config.type === 15) {
    result.push(bytes.u32(0))
  }

  return result
}

//////////////////////////////////////////////////////////////////
//#pragma - Media Segment Atoms
//////////////////////////////////////////////////////////////////

export const moof = (config) => {
  return [
    bytes.strToUint8('moof'),
    mfhd(config),
    traf(config),
  ]
}

export const traf = (config) => {
  return [
    bytes.strToUint8('traf'),
    tfhd(config),
    tfdt(config),
    trun(config),
  ]
}

export const tfhd = (config) => {
  let result = [bytes.strToUint8('tfhd')]

  const defaultBaseIsMOOF                = 0x20000
  const baseDataOffsetPresent            = 0x000001
  const sampleDescriptionIndexPresent    = 0x000002  // sample-description-index-present
  const defaultSampleDurationPresent     = 0x000008  // default-sample-duration-present
  const defaultSampleSizePresent         = 0x000010  // default-sample-size-present
  const defaultSampleFlagsPresent        = 0x000020  // default-sample-flags-present
  const durationIsEmpty                  = 0x010000  // duration-is-empty

  let flags = defaultBaseIsMOOF|sampleDescriptionIndexPresent|defaultSampleSizePresent|defaultSampleFlagsPresent|defaultSampleDurationPresent

  if (config.streamType == 27) {
      result.push(bytes.u32(flags))        // track fragment flags
      result.push(bytes.u32(config.trackID)) // track id

      const firstSample   = config.payload[0]

      if (firstSample) {
        result.push(bytes.u32(1))                         // sample description index present
        result.push(bytes.u32(firstSample.pts))      // default sample duration
        result.push(bytes.u32((firstSample.length)))      // default sample size
        result.push(bytes.u32(0x2000000))                 // default sample flags
      }
  }

  return result
}

export const tfdt = (config) => {
  return [
    bytes.strToUint8('tfdt'),
    new Uint8Array([1]),
    new Uint8Array([0, 0, 0]),
    bytes.u64(config.decode)
  ]
}

export const trun = (config) => {
  let payload     = config.payload || []
  let sampleCount = payload.length

  const dataOffsetPresent                   = 0x0001
  const firstSampleFlagsPresent             = 0x0004
  const sampleDurationPresent               = 0x0100
  const sampleSizePresent                   = 0x0200
  const sampleFlagsPresent                  = 0x0400
  const sampleCompositionTimeOffsetsPresent = 0x0800

  const flags = dataOffsetPresent|sampleDurationPresent|sampleSizePresent|sampleFlagsPresent|sampleCompositionTimeOffsetsPresent

  let result = [
    bytes.strToUint8('trun'),
    bytes.u32(flags),                   // trun flags
    bytes.u32(sampleCount),             // sample count
    bytes.s32(config.offset)            // offset
  ]

  payload.forEach(g => {

    // console.log(g);

    result.push(bytes.u32(g.dts))  // duration
    result.push(bytes.u32(g.length))    // size

    if (g.isKeyFrame) {
      result.push(bytes.u32(0x02000000)) // sample is depended on
    } else {
      result.push(bytes.u32(0x01000000)) // samples depends on a keyframe
    }

    result.push(bytes.u32(g.dts - g.pts))

  })

  return result
}

export const mfhd = (config) => {
  return [
    bytes.strToUint8('mfhd'),
    new Uint8Array([0]),        // version
    new Uint8Array([0, 0, 0]),  // flags
    bytes.u32(config.currentMediaSequence)
  ]
}

export const mdat = (config) => {
  let result = [bytes.strToUint8('mdat')]

  config.payload.forEach(accessUnit => {

    let b = new Uint8Array(accessUnit.data)
    accessUnit.nalusWithoutConfig.forEach(n => {
      let b = new Uint8Array(n)
      result.push(bytes.u32(b.length))
      result.push(b)
    })
  })
  return result
}

//////////////////////////////////////////////////////////////////
//#pragma - Builder functions
//////////////////////////////////////////////////////////////////

export const flatten = (atom) => {
  return atom.flatMap(a => a)
}

export const prependSize = (atom, padding) => {
  const arr   = flatten(atom)
  const sum   = (acc, curr) => { return acc + curr.length  }
  let size    = arr.reduce(sum, 0) + 4
  if (padding) { size += padding }
  arr.unshift(bytes.u32(size))
  return arr
}

export const prepare = (atom) => {
  for (var i = 0; i < atom.length; i++) {
    const child = atom[i]
    if (child.constructor.name === 'Array') {
      atom[i] = prepare(child)
    }
  }

  return prependSize(atom)
}

export const build = (atom) => {
  const preparedAtom  = prepare(atom)
  const flattened     = flatten(preparedAtom)
  const fullAtom      = bytes.concatenate(Uint8Array, ...flattened)
  return fullAtom
}
