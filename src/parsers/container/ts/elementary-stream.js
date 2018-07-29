class ElementaryStream {

  static parse(transportStream, streamType) {
    let elementaryStream = new ElementaryStream(streamType)

    const pmt   = transportStream.packets.filter(p => p.constructor.name === 'PMT')[0]
    const track = pmt.tracks.filter(t => t.streamType === streamType)[0]

    if (!pmt)   { throw 'PMT not present in transport stream' }
    if (!track) { throw 'Track for stream type not found' }

    const streamPackets = transportStream.packets.filter(p => p.header.PID === track.elementaryPID)

    let prevNalu
    let prevPacket
    streamPackets.forEach(packet => {
      let data = packet.data
      for (var i = 0; i < data.byteLength; i++) {
        if (i < data.byteLength - 4) {
          if (data.getUint8(i) === 0x00) {
            if (data.getUint8(i+1) === 0x00) {
              if (data.getUint8(i+2) === 0x00) {
                if (data.getUint8(i+3) === 0x01) {

                  if (prevNalu) {
                    if (prevNalu.ContinuityCounter != packet.header.ContinuityCounter) {
                      console.log('Last Packet');
                    } else {
                      console.log('Current Packet');
                    }
                  }

                  let nalu                = {}
                  nalu.ContinuityCounter  = packet.header.ContinuityCounter
                  nalu.start              = i+4
                  nalu.type               = data.getUint8(i+4) & 0x1f

                  prevNalu = nalu
                }
              }
            }
          }
        }
      }
      prevPacket = packet
    })

    return elementaryStream
  }

  constructor(streamType) {
    this.streamType = streamType
    this.nalus      = []
  }

}


export default ElementaryStream
