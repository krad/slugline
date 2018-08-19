import * as bytes from '../../../helpers/byte-helpers'

class ADTS {

  static parse(pes) {
    let result = {units: [], streamType: 15, duration: 0, trackID: pes.trackID}
    let r   = bytes.streamReader(pes.packets)
    let cnt = 0
    let pkt
    let last

    let sync = new Uint8Array(12)

    let missChunk = []

    while (1) {
      if (r.atEnd()) { break }

      let bit = r.readBit()
      if (bit === undefined) { break }

      sync[11] = sync[10]
      sync[10] = sync[9]
      sync[9] = sync[8]
      sync[8] = sync[7]
      sync[7] = sync[6]
      sync[6] = sync[5]
      sync[5] = sync[4]
      sync[4] = sync[3]
      sync[3] = sync[2]
      sync[2] = sync[1]
      sync[1] = sync[0]
      sync[0] = bit

      if (bytes.equal(sync, [1,1,1,1,1,1,1,1,1,1,1,1])) {
        r.rewind(12)
        sync = new Uint8Array(12)
        pkt  = new ADTS(r)
        let pes = r.currentPacket()
        if (pes === undefined) { continue }
        if (pes) { pkt.packet = pes.header }

        last = result.units.slice(-1)[0]
        if (last) {
          if (pkt.header.samplingFreq === last.header.samplingFreq) {
            pkt.readInPacket(r)
            pkt.id = cnt++
            result.units.push(pkt)
          } else {
            // r.rewind(12)
            // console.log('bad packet', pkt.header);
          }
        } else {
          pkt.readInPacket(r)
          pkt.id = cnt ++
          result.units.push(pkt)
        }
      }
    }

    return result
  }

  // A	12	syncword 0xFFF, all bits must be 1
  // B	1	MPEG Version: 0 for MPEG-4, 1 for MPEG-2
  // C	2	Layer: always 0
  // D	1	protection absent, Warning, set to 1 if there is no CRC and 0 if there is CRC
  // E	2	profile, the MPEG-4 Audio Object Type minus 1
  // F	4	MPEG-4 Sampling Frequency Index (15 is forbidden)
  // G	1	private bit, guaranteed never to be used by MPEG, set to 0 when encoding, ignore when decoding
  // H	3	MPEG-4 Channel Configuration (in the case of 0, the channel configuration is sent via an inband PCE)
  // I	1	originality, set to 0 when encoding, ignore when decoding
  // J	1	home, set to 0 when encoding, ignore when decoding
  // K	1	copyrighted id bit, the next bit of a centrally registered copyright identifier, set to 0 when encoding, ignore when decoding
  // L	1	copyright id start, signals that this frame's copyright id bit is the first bit of the copyright id, set to 0 when encoding, ignore when decoding
  // M	13	frame length, this value must include 7 or 9 bytes of header length: FrameLength = (ProtectionAbsent == 1 ? 7 : 9) + size(AACFrame)
  // O	11	Buffer fullness
  // P	2	Number of AAC frames (RDBs) in ADTS frame minus 1, for maximum compatibility always use 1 AAC frame per ADTS frame
  // Q	16
  constructor(bitReader) {
    this.header = {}
    this.header.sync                      = bitReader.readBits(12)
    this.header.version                   = bitReader.readBit()
    this.header.layer                     = bitReader.readBits(2)
    this.header.protectionAbsent          = bitReader.readBit()
    this.header.profileMinusOne           = bitReader.readBits(2)
    this.header.samplingFreq              = bitReader.readBits(4)
    this.header.privateBit                = bitReader.readBit()
    this.header.channelConfig             = bitReader.readBits(3)
    this.header.originality               = bitReader.readBit()
    this.header.home                      = bitReader.readBit()
    this.header.copyrightID               = bitReader.readBit()
    this.header.copyrightIDStart          = bitReader.readBit()
    this.header.frameLength               = bitReader.readBits(13)
    this.header.bufferFullness            = bitReader.readBits(11)
    this.header.numberOfFramesMinusOne    = bitReader.readBits(2)
    this.header.samplingRate              = sampleRate(this.header.samplingFreq)
    this.header.channelConfigDescription  = channelConfigurations(this.header.channelConfig)

    if (!this.header.protectionAbsent) {
      this.header.crc = bitReader.readBits(16)
    }

    this.payload        = []

  }

  get headerSize() {
    return this.header.protectionAbsent === 1 ? 7 : 9
  }

  get packetLength() {
    return ((this.header.frameLength) * (this.header.numberOfFramesMinusOne+1)) - (this.headerSize)
  }

  readInPacket(reader) {
    let cnt = 0
    while (cnt < this.packetLength) {
      let bits = reader.readBits(8)
      if (bits === undefined) { break }
      this.payload.push(bits)
      cnt += 1
    }
  }

  get length() {
    return this.payload.length
  }

  get duration() {
    return (this.header.numberOfFramesMinusOne+1) * 1024
  }
}

const sampleRate = (sampleFreq) => {
  switch (sampleFreq) {
    case 0:
      return 96000
    case 1:
      return 88200
    case 2:
      return 64000
    case 3:
      return 48000
    case 4:
      return 44100
    case 5:
      return 32000
    case 6:
      return 24000
    case 7:
      return 22050
    case 8:
      return 16000
    case 9:
      return 12000
    case 10:
      return 11025
    case 11:
      return 8000
    case 12:
      return 7350
    case 13:
    case 14:
      return 'RESERVED'
    case 15:
      return 'FORBIDDEN'
  }
}

const channelConfigurations = (config) => {
  switch (config) {
    case 0:
      return 'AOT Specific Config'
    case 1:
      return '1 channel: front-center'
    case 2:
      return '2 channels: front-left, front-right'
    case 3:
      return '3 channels: front-center, front-left, front-right'
    case 4:
      return '4 channels: front-center, front-leg, front-right, back-center'
    case 5:
      return '5 channels: front-center, front-left, front-right, back-left, back-right'
    case 6:
      return '6 channels: front-center, front-left, front-right, back-left, back-right, LFE-channel'
    case 7:
      return '8 channels: front-center, front-left, front-right, side-left, side-right, back-left, back-right, LFE-channel'
    case 8:
    case 9:
    case 10:
    case 11:
    case 12:
    case 13:
    case 14:
    case 15:
      return 'RESERVED'
  }
}

export default ADTS
