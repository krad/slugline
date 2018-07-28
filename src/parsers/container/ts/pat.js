import { Packet } from './packet'

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

export default PAT
