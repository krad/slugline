//// FIXME: Use the elementary stream iterator to handle all this

/**
 * Parse ADTS packets out of all audio packets
 */
const parseAudioPackets = (es, streamPackets) => {
  let packetIdx     = 0
  let currentFrame
  let firstFrame
  while (packetIdx < streamPackets.length) {
    let packet    = streamPackets[packetIdx]
    let bitReader = new bytes.BitReader(packet.data)
    while ((bitReader.currentBit) <= bitReader.length * 8) {

      if (currentFrame) {
        if (currentFrame.bytesToRead > 0) {
          currentFrame.payload += (bitReader.readBits(8))
          currentFrame.bytesToRead -= 1
          continue
        }
      }

      if (bitReader.readBits(12) === 0xfff) {
        let possibleMatch = new ADTS(bitReader)
        if (!firstFrame) {
          firstFrame   = possibleMatch
          currentFrame = possibleMatch
        } else {
          if (possibleMatch.samplingFreq !== firstFrame.samplingFreq) {
            bitReader.currentBit -= (possibleMatch.bitsRead + 11)
          } else {
            es.chunks.push(possibleMatch)
            currentFrame = possibleMatch
          }
        }
      }
    }
    packetIdx += 1
  }

}

class ADTS {
  constructor(bitReader) {
    this.version                 = bitReader.readBit()
    this.layer                   = bitReader.readBits(2)
    this.protectionAbsent        = bitReader.readBit()
    this.profileMinusOne         = bitReader.readBits(2)
    this.samplingFreq            = bitReader.readBits(4)
    this.privateBit              = bitReader.readBit()
    this.channelConfig           = bitReader.readBits(3)
    this.originality             = bitReader.readBit()
    this.home                    = bitReader.readBit()
    this.copyrightID             = bitReader.readBit()
    this.copyrightIDStart        = bitReader.readBit()
    this.frameLength             = bitReader.readBits(13)
    this.bufferFullness          = bitReader.readBits(11)
    this.numberOfFramesMinusOne  = bitReader.readBits(2)

    this.bitsRead = 44

    if (!this.protectionAbsent) {
      this.crc = bitReader.readBits(16)
      this.bitsRead += 16
    }

    const headerSize             = this.protectionAbsent === 1 ? 7 : 9
    this.bytesToRead             = ((this.frameLength) * (this.numberOfFramesMinusOne+1)) - headerSize
    this.payload                 = new Uint8Array()
  }
}
