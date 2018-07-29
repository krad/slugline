import { SPS, PPS, AUD } from './packet'

class ElementaryStream {

  static parse(transportStream, streamType) {
    let es    = new ElementaryStream(streamType)

    const pmt   = transportStream.packets.filter(p => p.constructor.name === 'PMT')[0]
    const track = pmt.tracks.filter(t => t.streamType === streamType)[0]

    if (!pmt)   { throw 'PMT not present in transport stream' }
    if (!track) { throw 'Track for stream type not found' }

    const streamPackets = transportStream.packets.filter(p => p.header.PID === track.elementaryPID)
    let packetIdx       = 0
    let nalu            = []
    let gotFirst        = false
    while (packetIdx < streamPackets.length) {
      let packet = streamPackets[packetIdx]
      let data   = packet.data
      let cursor = 0

      while (cursor < data.byteLength) {
        const found = foundDelimiter(data, cursor)
        if (found[0]) {
          if (gotFirst) {
            es.nalus.push(nalu)
            nalu = []
          } else {
            gotFirst = true
          }
          cursor += found[1]
        } else {
          if (gotFirst) { nalu.push(data.getUint8(cursor)) }
          cursor += 1
        }

      }

      packetIdx += 1
    }

    return es
  }

  constructor(streamType) {
    this.streamType = streamType
    this.nalus      = []
  }

}

const foundDelimiter = (data, cursor) => {
  if (cursor < data.byteLength - 4) {
    if (data.getUint8(cursor) === 0x00) {
      if (data.getUint8(cursor+1) === 0x00) {
        if (data.getUint8(cursor+2) === 0x01) { return [true, 3] }
        if (data.getUint8(cursor+2) === 0x00) {
          if (data.getUint8(cursor+3) === 0x01) { return [true, 4] }
        }
      }
    }
  }
  return [false, 1]
}

export default ElementaryStream
