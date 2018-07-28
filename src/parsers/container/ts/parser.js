import PacketHeader from './packet-header'
import PAT from './pat'
import PMT from './pmt'
import { MediaPacket } from './packet'

class TransportStreamParser {
  constructor() {
    this.PAT    = undefined
    this.PMT_ID = undefined
  }

  parse(arrayBuffer) {
    let view          = new DataView(arrayBuffer.buffer)
    const header      = new PacketHeader(view)

    /// 0 Signals we have a PAT
    if (header.PID === 0) {
      const pat   = new PAT(header, new DataView(arrayBuffer.buffer, 4))
      this.pmtPID = pat.pmtID
      return pat
    }

    // Header matches the pmtPID we got from the PAT
    if (header.PID === this.pmtPID) {
      const pmt       = new PMT(header, new DataView(arrayBuffer.buffer, 4))
      this.tracks     = pmt.tracks
      this.trackPIDs  = pmt.tracks.map(t => t.elementaryPID)
      return pmt
    }

    // Check if the pid matches any of the pids from the tracks we parsed from the PMT
    if (this.trackPIDs.includes(header.PID)) {
      const track       = this.tracks.filter(t => t.elementaryPID === header.PID)[0]
      const mediaPacket = new MediaPacket(header, new DataView(arrayBuffer.buffer, 4), track.streamType)
      return mediaPacket
    }

  }
}

export default TransportStreamParser
