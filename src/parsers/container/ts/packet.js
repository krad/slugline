class TransportStreamParser {
  constructor() {
    this.PAT    = undefined
    this.PMT_ID = undefined
  }

  parse(arrayBuffer) {
    let view          = new DataView(arrayBuffer.buffer)
    const headerBytes = view.getUint32(0)
    const header      = new PacketHeader(headerBytes)
    if (header.PID === 0) {
      const pat   = new PAT(header, new DataView(arrayBuffer.buffer, 4))
      this.PMT_ID = pat.pmtID
      return pat
    }

    if (header.PID === this.PMT_ID) {
      return new PMT(header, new DataView(arrayBuffer.buffer, 4))
    }

  }
}

class Packet {
  constructor(header, dataView) {
    this.header = header
    this.data   = dataView
    this.length = header.length + dataView.byteLength
  }
}

class PacketHeader {
  constructor(headerBytes) {
    this.syncByte               = headerBytes >> 24
    this.TEI                    = (headerBytes >> 8) & 0x000008
    this.PUSI                   = (headerBytes >> 8) & 0x000004
    this.PRIORITY               = (headerBytes >> 8) & 0x000002
    this.PID                    = (headerBytes >> 8) & 0x001fff
    this.TSC                    = (headerBytes >> 4) & 0xc0
    this.AdaptationFieldControl = (headerBytes >> 4) & 0x30
    this.continuityCounter      = headerBytes & 0xf
    this.length                 = 4
  }
}

// The program association table lists all programs available in the transport stream.
// Each of the listed programs is identified by a 16-bit value called program_number.
// Each of the programs listed in PAT has an associated value of PID for its program map table (PMT).
// The value 0x0000 for program_number is reserved to specify the PID where to look for network information table. If such a program is not present in PAT the default PID value (0x0010) shall be used for NIT.
// TS packets containing PAT information always have PID 0x0000.
class PAT extends Packet {
  constructor(header, dataView) {
    super(header, dataView)
    /// There's a header flag we should check to see if we should pad this or not
    // I don't *THINK* that rules applies to HLS streams at this time.
    this.tableId                = dataView.getUint8(1)
    let next                    = dataView.getUint16(2)
    this.sectionSyntaxIndicator = next >> 15

    // These are here so I can tell I am in fact getting the correct bits
    const priv          = (next >> 14) & 0x1
    const res           = (next >> 12) & 0x3
    const unused        = (next >> 10) & 0x3

    /// Ok, actual work stuff
    this.sectionLength        = (next & 0x3FF)
    this.streamId             = dataView.getUint16(4)

    next                      = dataView.getUint8(6)
    const res2                = next & 0xc0
    this.version              = next & 0x1f
    this.currentNextIndicator = next & 0x1

    this.sectionNumber        = dataView.getUint8(7)
    this.lastSectionNumber    = dataView.getUint8(8)

    let numProgramBytes = ((this.sectionLength - 5) - 4)
    this.programs        = []
    let nextIdx         = 9
    for (var i = 0; i < numProgramBytes / 4; i++) {
      let program = {}
      const programNumber   = dataView.getUint16(nextIdx)
      program.programNumber = programNumber
      next                  = dataView.getUint16(nextIdx+2)
      if (programNumber === 0) { program.networkPID = next & 0x1FFF }
      else                     { program.mapID = next & 0x1FFF }
      this.programs.push(program)
      nextIdx += 4
    }
    this.crc = dataView.getUint32(nextIdx)
  }

  get pmtID() {
    return this.programs[0].mapID
  }
}

// Program Map Tables (PMTs) contain information about programs. For each program, there is one PMT.
//
// While the MPEG-2 standard permits more than one PMT section to be transmitted on a single PID
// (Single Transport stream PID contains PMT information of more than one program),
// most MPEG-2 "users" such as ATSC and SCTE require each PMT to be transmitted on a separate PID that
// is not used for any other packets. The PMTs provide information on each program present in the
// transport stream, including the program_number, and list the elementary streams that comprise the
// described MPEG-2 program. There are also locations for optional descriptors that describe the
// entire MPEG-2 program, as well as an optional descriptor for each elementary stream.
//
// Each elementary stream is labeled with a stream_type value.
class PMT extends Packet {
  constructor(header, dataView) {
    super(header, dataView)

    this.tableId                = dataView.getUint8(1)
    let next                    = dataView.getUint16(2)
    this.sectionSyntaxIndicator = (next & 0x8000)
    this.sectionLength          = (next & 0xfff)
    this.programNumber          = dataView.getUint16(4)

    next                        = dataView.getUint8(6)
    this.version                = (next & 0x3e)
    this.currentNextIndicator   = (next & 0x1)
    this.sectionNumber          = dataView.getUint8(7)
    this.lastSectionNumber      = dataView.getUint8(8)
    this.pcrPID                 = dataView.getUint16(9) & 0x1fff
    this.programInfoLength      = dataView.getUint16(11) & 0xfff

    let nextIdx = this.programInfoLength + 13
    let bytesRemaining = this.sectionLength - 9 - this.programInfoLength - 4

    while (bytesRemaining > 0) {
      const streamType    = dataView.getUint8(nextIdx)

      nextIdx += 1
      const elementaryPID = dataView.getUint16(nextIdx) & 0x1ff
      console.log(elementaryPID);

      nextIdx += 2
      const esInfoLength  = dataView.getUint16(nextIdx) & 0xfff

      console.log(streamType);
      bytesRemaining      = esInfoLength

      nextIdx += 2
      const descLength = dataView.getUint8(nextIdx)
      while(bytesRemaining >= 2) {
        nextIdx += 1
        const tag = dataView.getUint8(nextIdx)

        nextIdx += 1
        const descLength = dataView.getUint8(nextIdx+7)
        bytesRemaining -= descLength + 2
      }

      nextIdx += 1
      bytesRemaining -= 5 + esInfoLength
    }
  }
}

class Video extends Packet {
  constructor(header, dataView) {
    super(header, dataView)
  }
}

class Audio extends Packet {
  constructor(header, dataView) {
    super(header, dataView)
  }
}

/// FIXME: Use this.
const isBigEndianSystem = () => {
  let buffer  = new ArrayBuffer(2)
  let array   = new Uint8Array(buffer)
  let array16 = new Uint16Array(buffer)
  array[0] = 0xAA
  array[1] = 0xBB
  if (array16[0] === 0xBBAA) { return false }
  if (array16[1] === 0xAABB) { return true }
  throw new Error("Something wrong with system memory.  Can't determine endianness")
}

export { Packet, TransportStreamParser }
