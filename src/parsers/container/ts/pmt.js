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
  constructor(header, bitReader) {
    super(header, bitReader)
    this.tracks = []

    this.ptrField = bitReader.readBits(8)
    if (this.ptrField) { bitReader.readBits(this.ptrField * 8) }

    this.tableID                = bitReader.readBits(8)
    this.sectionSyntaxIndicator = bitReader.readBit()
    this.privateBit             = bitReader.readBit()
    bitReader.readBits(2)                                 // reserved bits
    bitReader.readBits(2)                                 // section length unused bits
    this.sectionLength          = bitReader.readBits(10)

    bitReader.readBits(3) // reserved
    this.pcrPID                 = bitReader.readBits(13)
    bitReader.readBits(4) // reserved bits
    bitReader.readBits(2) // program info length unused bits

    this.programInfoLength = bitReader.readBits(10)

    if (this.programInfoLength) {

      let i = 0
      while (i < this.sectionLength) {
        let streamType = bitReader.readBits(8)
        bitReader.readBits(3) // reserved
        let elementaryPID = bitReader.readBits(13)
        bitReader.readBits(4) // reserved
        bitReader.readBits(2) // es info length unused bits
        bitReader.readBits(10) // es info length length

        if (streamType === 15 || streamType === 27) {
          this.tracks.push({streamType: streamType, elementaryPID: elementaryPID})
        }

        i += 5
      }
    }

  }
}

export default PMT
