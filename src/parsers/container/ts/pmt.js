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
    this.objType  = 'PMT'
    this.programs = []

    this.ptrField = bitReader.readBits(8)
    if (this.ptrField) { bitReader.readBits(this.ptrField * 8) }

    this.tableID                = bitReader.readBits(8)
    let sectionSyntaxIndicator  = bitReader.readBit()
    this.privateBit             = bitReader.readBit()

    bitReader.readBits(2)   // reserved bits
    bitReader.readBits(2)   // section length unused bits
    let sectionLength = bitReader.readBits(10)

    let stopBit = bitReader.currentBit() + (sectionLength * 8)
    while (bitReader.currentBit() < stopBit) {
      let program                   = {tracks: []}
      program.id                    = bitReader.readBits(16)
      bitReader.readBits(2)
      program.versionNumber         = bitReader.readBits(5)
      let currentNextIndicator      = bitReader.readBit()
      let sectionNumber             = bitReader.readBits(8)
      let lastSectionNumber         = bitReader.readBits(8)

      let reserved                    = bitReader.readBits(3)
      program.pcrPID                  = bitReader.readBits(13)
      reserved                        = bitReader.readBits(4)
      let programInfoLengthUnusedBits = bitReader.readBits(2)
      let programInfoLength           = bitReader.readBits(10)

      if (programInfoLength > 0) {
        let descriptor = {data: []}
        descriptor.tag        = bitReader.readBits(8)
        let descriptorLength  = bitReader.readBits(8)

        let descStopBit = bitReader.currentBit() + (descriptorLength * 8)
        while (bitReader.currentBit() < descStopBit) {
          descriptor.data.push(bitReader.readBits(8))
        }
        program.descriptor = descriptor
      }

      let esStopBit = stopBit - (32) // 32 bits for the CRC at the end
      while (bitReader.currentBit() < esStopBit) {
        let track                         = {}
        track.streamType = bitReader.readBits(8)
        bitReader.readBits(3)
        track.elementaryPID = bitReader.readBits(13)
        bitReader.readBits(4)
        bitReader.readBits(2)
        let esInfoLength = bitReader.readBits(10)

        let esInfo = []
        let esStopBit = bitReader.currentBit() + (esInfoLength * 8)
        if (track.streamType !== 14) {
          while (bitReader.currentBit() < esStopBit) {
            esInfo.push(bitReader.readBits(8))
          }          
        }

        if (esInfo.length > 0) {
          track.esInfo = esInfo
        }
        program.tracks.push(track)
      }

      let crc = bitReader.readBits(32)
      this.programs.push(program)
    }
  }
}

export default PMT
