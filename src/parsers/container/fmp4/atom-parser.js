/**
 * const ftyp - Parses a 'ftyp atom'
 *
 * @param  {Atom} atom          An 'ftyp' Atom
 * @param  {Uint8Array} payload Uint8 array of atom data starting AFTER the 4 byte atom name
 */
const ftyp = (atom, payload) => {
  let view              = new DataView(payload.buffer, 4, 4)
  var majorBrandBytes   = payload.slice(0, 4)
  atom.majorBrand       = String.fromCharCode.apply(null, majorBrandBytes)
  atom.minorVersion     = view.getUint32(0)
  atom.compatibleBrands = []

  let i = 8
  while (i < payload.length) {
    let brandSlice = payload.slice(i, i+4)
    let brandName  = String.fromCharCode.apply(null, brandSlice)
    atom.compatibleBrands.push(brandName)
    i += 4
  }
}

const mvhd = (atom, payload) => { }
const tkhd = (atom, payload) => { }
const mdhd = (atom, payload) => { }
const hdlr = (atom, payload) => { }
const vmhd = (atom, payload) => { }
const dref = (atom, payload) => { }
const dinf = (atom, payload) => { }
const stco = (atom, payload) => { }
const stsz = (atom, payload) => { }
const stsc = (atom, payload) => { }
const stts = (atom, payload) => { }
const pasp = (atom, payload) => { }
const colr = (atom, payload) => { }

/**
 * const avcc - Parses an 'avcC' type atom
 *
 * @param  {Atom} atom          An 'avcC' type atom
 * @param  {Uint8Array} payload Uint8 array of atom data starting AFTER the 4 byte atom name
 */
const avcC = (atom, payload) => {
  var view                  = new DataView(payload.buffer, 0, 4)
  atom.version              = view.getUint8(0)
  atom.profile              = view.getUint8(1)
  atom.profileCompatibility = view.getUint8(2)
  atom.levelIndication      = view.getUint8(3)
}

const avc1 = (atom, payload) => {
  var view    = new DataView(payload.buffer, 24, 4)
  atom.width  = view.getUint16(0)
  atom.height = view.getUint16(2)
}

const stsd = (atom, payload) => { }
const stbl = (atom, payload) => { }
const minf = (atom, payload) => { }
const mdia = (atom, payload) => { }
const trak = (atom, payload) => { }
const moov = (atom, payload) => { }
const trex = (atom, payload) => { }
const mvex = (atom, payload) => { }
const mfhd = (atom, payload) => { }
const tfhd = (atom, payload) => { }
const tfdt = (atom, payload) => { }
const trun = (atom, payload) => { }
const traf = (atom, payload) => { }
const moof = (atom, payload) => { }
const mdat = (atom, payload) => { }
const smhd = (atom, payload) => { }
const mp4a = (atom, payload) => { }

 /**
  * class AudioSpecificConfig holds specifics about the audio decoder config
  *
  * @return {AudioSpecificConfig} A constructed audio specific config
  */
class AudioSpecificConfig {

  constructor(payload) {
    this.type          = payload[0] >> 3
    this.frequency     = payload[0] << 1
    this.channelConfig = null
  }
}

/**
 * const esds - Parses an 'esds' type atom
 *
 * @param  {Atom} atom          An 'esds' type atom
 * @param  {Uint8Array} payload Uint8 array of atom data starting AFTER the 4 byte atom name
 */
const esds = (atom, payload) => {

  /// It's an elementary stream.  Chunk it up.
  var chunks = []
  var currentChunk
  for (var i = 4; i < payload.length; i++) {
    if (payload[i+1] == 0x80) {
      if (payload[i+2] == 0x80) {
        if (payload[i+3] == 0x80) {
          if (currentChunk) { chunks.push(currentChunk) }
          currentChunk = []
        }
      }
    }
    currentChunk.push(payload[i])
  }

  // Decoder Config is signaled with 0x04
  var decoderConfig = chunks
  .map(function(e) { if (e[0] == 0x04) { return e }})
  .filter(function(e){ if (e) { return e }})[0].slice(4)

  atom.objectProfileIndication = decoderConfig[1]

  // Audio Specific Config is signaled with 0x05
  decoderConfig = chunks
  .map(function(e) { if (e[0] == 0x05) { return e }})
  .filter(function(e){ if (e) { return e }})[0].slice(4)

  var audioSpecificConfigBytes  = decoderConfig.slice(1, 1+decoderConfig[0])
  atom.audioSpecificConfig      = new AudioSpecificConfig(audioSpecificConfigBytes)
}

const AtomParser = {
  "ftyp": ftyp,
  "mvhd": mvhd,
  "tkhd": tkhd,
  "mdhd": mdhd,
  "hdlr": hdlr,
  "vmhd": vmhd,
  "dref": dref,
  "dinf": dinf,
  "stco": stco,
  "stsz": stsz,
  "stsc": stsc,
  "stts": stts,
  "pasp": pasp,
  "colr": colr,
  "avcC": avcC,
  "avc1": avc1,
  "stsd": stsd,
  "stbl": stbl,
  "minf": minf,
  "mdia": mdia,
  "trak": trak,
  "moov": moov,
  "trex": trex,
  "mvex": mvex,
  "mfhd": mfhd,
  "tfhd": tfhd,
  "tfdt": tfdt,
  "trun": trun,
  "traf": traf,
  "moof": moof,
  "mdat": mdat,
  "smhd": smhd,
  "mp4a": mp4a,
  "esds": esds,
}


/**
 * Array.prototype.flatMap - flatMap over arrays
 *
 * @param  {Function} lambda Map function
 * @return {Array}        Mapped array flattened with undefined/null removed
 */
Array.prototype.flatMap = function(lambda) {
  return Array.prototype.concat
  .apply([], this.map(lambda))
  .filter(function(x){
    if (x) { return x }
  })
}

export default AtomParser
