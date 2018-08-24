import { Packet } from './packet'

// The program association table lists all programs available in the transport stream.
// Each of the listed programs is identified by a 16-bit value called program_number.
// Each of the programs listed in PAT has an associated value of PID for its program map table (PMT).
// The value 0x0000 for program_number is reserved to specify the PID where to look for network information table. If such a program is not present in PAT the default PID value (0x0010) shall be used for NIT.
// TS packets containing PAT information always have PID 0x0000.
class PAT extends Packet {
  constructor(header, bitReader) {
    super(header, bitReader)
    this.objType = 'PAT'

    this.ptrField = bitReader.readBits(8)
    if (this.ptrField) { bitReader.readBits(this.ptrField * 8) }

    this.tableID                = bitReader.readBits(8)
    this.sectionSyntaxIndicator = bitReader.readBit()
    this.privateBit             = bitReader.readBit()
    bitReader.readBits(2)                                 // reserved bits
    bitReader.readBits(2)                                 // section length unused bits
    this.sectionLength          = bitReader.readBits(10)

    this.programs = []

    let tableID               = bitReader.readBits(16)
    bitReader.readBits(2) // reserved
    let versionNumber         = bitReader.readBits(5)
    let currentNextIndicator  = bitReader.readBit()
    let sectionNumber         = bitReader.readBits(8)
    let lastSectionNumber     = bitReader.readBits(8)

    let programNumber = bitReader.readBits(16)
    bitReader.readBits(3)
    let programMapPID = bitReader.readBits(13)

    this.programs.push({programNumber: programNumber, mapID: programMapPID})

    this.crc = bitReader.readBits(32)
  }

  get pmtID() {
    return this.programs[0].mapID
  }
}

export default PAT
