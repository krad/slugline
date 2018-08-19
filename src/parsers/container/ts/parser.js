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
      if (pmt.programs.length <= 0) { throw 'Program Map Table had no programs listed' }
      this.tracks     = pmt.programs[0].tracks
      this.trackPIDs  = this.tracks.map(t => t.elementaryPID)
      return pmt
    } else if (this.trackPIDs.includes(header.PID)) {
      const track       = this.tracks.filter(t => t.elementaryPID === header.PID)[0]
      const mediaPacket = new MediaPacket(header, bitReader, track.streamType)
      return mediaPacket
    } else {
      console.log('!!! ERROR PARSING PROGRAM PACKETS !!!');
    }
  }
}

export default TransportStreamParser
