class Packet {
  static parse(arrayBuffer) {
    let view          = new DataView(arrayBuffer.buffer)
    const headerBytes = view.getUint32(0)

    const header = new PacketHeader(headerBytes)
    switch (header.PID) {
      case 0:   return new PAT(header, view)
      case 1:   return new CAT(header, view)
      case 2:   return new TSDT(header, view)
      case 3:   return new IPMP(header, view)
      case 480: return new PMT(header, view)
      case 481: return new Video(header, view)
      case 482: return new Audio(header, view)
      default:
        console.log(header.PID);
    }
  }

  constructor(header, dataView) {
    this.header = header
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
  }
}

// The program association table lists all programs available in the transport stream.
// Each of the listed programs is identified by a 16-bit value called program_number.
// Each of the programs listed in PAT has an associated value of PID for its program map table (PMT).
// The value 0x0000 for program_number is reserved to specify the PID where to look for network information table. If such a program is not present in PAT the default PID value (0x0010) shall be used for NIT.
// TS packets containing PAT information always have PID 0x0000.
class PAT extends Packet {
  constructor(header, dataView) {
    super(dataView)
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
    super(dataView)
  }
}

class CAT extends Packet {
  constructor(header, dataView) {
    super(dataView)
  }
}

class TSDT extends Packet {
  constructor(header, dataView) {
    super(dataView)
  }
}

class IPMP extends Packet {
  constructor(header, dataView) {
    super(dataView)
  }
}

class Video extends Packet {
  constructor(header, dataView) {
    super(dataView)
  }
}

class Audio extends Packet {
  constructor(header, dataView) {
    super(dataView)
  }
}

class Null extends Packet {
  constructor(header, dataView) {
    super(dataView)
  }
}

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

export default Packet
