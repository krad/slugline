import TransportStreamParser from './parser'
import ElementaryStream from './elementary-stream'
import { createCodecsString } from '../mpeg-parser'
import * as bytes from '../../../helpers/byte-helpers'

class TransportStream {
  static parse(arrayBuffer) {
    let parser     = new TransportStreamParser()
    let stream     = new TransportStream()
    let packetSize = detectPacketSize(arrayBuffer.slice(0, 205))
    for (var i = 0; i < arrayBuffer.length; i+= packetSize) {
      let packet = parser.parse(arrayBuffer.slice(i, (i+packetSize)))
      if (packet) { stream.packets.push(packet) }
    }
    return stream
  }

  constructor() {
    this.packets = []
  }

  get trackPackets() {
    const pmt = this.packets.filter(p => p.constructor.name == 'PMT')[0]
    return pmt.tracks.map((t, idx) => {
      return ElementaryStream.parse(this, t.streamType, idx+1)
    })
  }

  get codecs() {
    return this.trackPackets.map(p => p.codec)
  }

  get codecsString() {
    return createCodecsString(this.codecs)
  }

  get PMT() {
    return this.packets.filter(p => p.constructor.name == 'PMT')[0]
  }

  get tracks() {
    return this.PMT.tracks.map((t, idx) => {
      return ElementaryStream.parse(this, t.streamType, idx+1)
    })
  }

  get tracksConfig() {
    return this.tracks.map((t,idx) => {

      // let result = {type: t.streamType, codec: t.codecBytes, id: idx+1}
      //
      // if (t.streamType === 27) {
      //   result.sps = bytes.parseSPS(t.codecBytes[0])
      // }

      return result
    })
  }

}


const detectPacketSize = (front) => {
  for (var i = 0; i < front.length; i++) {
    const b = front[i]
    if (b === 0x47 && i >= 188) {
      return i
    }
  }
}

export default TransportStream
