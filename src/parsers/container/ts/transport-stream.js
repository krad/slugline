import { Packet, TransportStreamParser } from './packet'

class TransportStream {
  static parse(arrayBuffer) {
    let parser     = new TransportStreamParser()
    let stream     = new TransportStream()
    let packetSize = detectPacketSize(arrayBuffer.slice(0, 205))
    for (var i = 0; i < arrayBuffer.length; i+=packetSize) {
      let packet = parser.parse(arrayBuffer.slice(i, i+packetSize))
      if (packet) { stream.packets.push(packet) }
    }
    return stream
  }

  constructor() {
    this.packets = []
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
