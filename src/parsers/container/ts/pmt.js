import { Packet } from './packet'

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

    this.ptrField               = dataView.getUint8(0)
    this.tableId                = dataView.getUint8(1)
    let next                    = dataView.getUint16(2)

    this.sectionSyntaxIndicator = (next & 1)
    this.sectionLength          = (next & 0xfff)

    this.programNumber          = dataView.getUint16(4)

    next                        = dataView.getUint8(6)
    this.version                = (next & 0x3e)
    this.currentNextIndicator   = (next & 0x1)
    this.sectionNumber          = dataView.getUint8(7)
    this.lastSectionNumber      = dataView.getUint8(8)

    this.pcrPID                 = dataView.getUint16(9) & 0x1fff
    this.programInfoLength      = dataView.getUint16(11) & 0xfff
    this.tracks                 = []

    let nextIdx = 13 + this.programInfoLength
    while (nextIdx < this.sectionLength) {
      let track = {}
      track.streamType = dataView.getUint8(nextIdx)

      nextIdx += 1
      track.elementaryPID = dataView.getUint16(nextIdx) & 0x1ff

      nextIdx += 2
      track.esInfoLength = dataView.getUint16(nextIdx) & 0xfff

      nextIdx += 2
      track.descLength = dataView.getUint8(nextIdx)

      let esInfo = []
      for (var i = 0; i < (nextIdx+track.esInfoLength)-nextIdx; i++) {
        esInfo.push(dataView.getUint8(nextIdx+i))
      }
      track.esInfo = new Uint8Array(esInfo)

      nextIdx += track.esInfoLength
      this.tracks.push(track)
    }

  }
}

export default PMT
