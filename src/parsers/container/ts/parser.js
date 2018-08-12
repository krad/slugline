import * as bytes from '../../../helpers/byte-helpers'
import PacketHeader from './packet-header'
import PAT from './pat'
import PMT from './pmt'
import { MediaPacket } from './packet'

class TransportStreamParser {
  constructor() {
    this.PAT          = undefined
    this.PMT_ID       = undefined
    this.trackPIDs    = []
  }

  parse(arrayBuffer) {

    let bitReader     = new bytes.BitReader(arrayBuffer)
    const header      = new PacketHeader(bitReader)

    // 0 Signals we have a PAT
    if (header.PID === 0) {
      const pat   = new PAT(header, bitReader)
      this.pmtPID  = pat.pmtID
      return pat
    } else if (header.PID === this.pmtPID) {
      const pmt       = new PMT(header, bitReader)
      this.tracks     = pmt.tracks
      this.trackPIDs  = pmt.tracks.map(t => t.elementaryPID)
      return pmt
    } else if (this.trackPIDs.includes(header.PID)) {
      const track       = this.tracks.filter(t => t.elementaryPID === header.PID)[0]
      const mediaPacket = new MediaPacket(header, bitReader, track.streamType)
      return mediaPacket
    } else {
      /// This should not have happened
      console.log('!!! ERROR PARSING PROGRAM PACKETS !!!');
    }
  }
}

export default TransportStreamParser
