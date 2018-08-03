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
            es.chunks.push(nalu)
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
    this.chunks      = []
  }

  get codec() {
    // Video
    if (this.streamType === 27) {
      const videoParams = this.chunks.filter(nalu => {
        const naluType = nalu[0] & 0x1f
        if (naluType === 7) { return nalu }
      })

      if (videoParams.length <= 0) { return undefined }

      const arrayBuffer           = Uint8Array.from(videoParams[0])
      const view                  = new DataView(arrayBuffer.buffer)
      const version               = view.getUint8(0)
      const profile               = view.getUint8(1)
      const profileCompatibility  = view.getUint8(2)
      const levelIndication       = view.getUint8(3)

      const params = [profile, profileCompatibility, levelIndication].map(function(i) {
        return ('0' + i.toString(16).toUpperCase()).slice(-2)
      }).join('');

      return ['avc1', params].join('.')
    }

    if (this.streamType === 15) {
      // console.log('hiiii');
      // var chunks = []
      // var currentChunk
      // for (var i = 4; i < payload.length; i++) {
      //   if (payload[i+1] == 0x80) {
      //     if (payload[i+2] == 0x80) {
      //       if (payload[i+3] == 0x80) {
      //         if (currentChunk) { chunks.push(currentChunk) }
      //         currentChunk = []
      //       }
      //     }
      //   }
      //   currentChunk.push(payload[i])
      // }
    }

    return undefined
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
