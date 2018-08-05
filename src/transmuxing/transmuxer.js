import * as atoms from './atoms'
import * as bytes from './byte-helpers'
import ElementaryStream from '../parsers/container/ts/elementary-stream'

class Transmuxer {
  constructor(transportStream) {
    this.ts      = transportStream
    const pmt    = this.ts.packets.filter(p => p.constructor.name == 'PMT')[0]
    this.tracks  = pmt.tracks.map((t, idx) => { return ElementaryStream.parse(this.ts, t.streamType, idx+1) })
    this.config  = this.tracks.map((t,idx) => {return {type: t.streamType, codec: t.codecBytes, id: idx+1}} )

    this.initSegments         = []
    this.mediaSegments        = []
    this.currentMediaSequence = 1

    this.config.forEach(config => {
      if (config.type === 27) {
        const buffer = new Uint8Array(config.codec[0])
        config.sps = bytes.parseSPS(buffer)
      }
    })

  }

  buildInitializationSegment() {
    let result = []
    result.push(atoms.ftyp())
    result.push(atoms.moov(this.config))
    result = result.map(a => atoms.build(a))
    return bytes.concatenate(Uint8Array, ...result)
  }

  buildTrack() {
    let GOPS = []
    let currentGOP
    const videoTrack = this.tracks.filter(t => t.streamType === 27)[0]
    const trackID    = videoTrack.trackID

    videoTrack.chunks.forEach(nalu => {
      const naluType = nalu[0] & 0x1f
      if (naluType === 1) {
        currentGOP.push(nalu)
      }

      if (naluType === 5) {
        if (currentGOP && currentGOP.length > 1) {
          GOPS.push({currentMediaSequence: this.currentMediaSequence++,
                                      gop: currentGOP})
        }
        currentGOP = [nalu]
      }
    })

    return {trackID: trackID, gops: GOPS}
  }

  buildMediaSegments() {
    const gops  = this.buildTrack()

    let result = []
    gops.gops.forEach(gop => {
      result.push(atoms.moof(gop))
      result.push(atoms.mdat(gop))
    })
    result = result.map(a => atoms.build(a))
    return bytes.concatenate(Uint8Array, ...result)
  }

}

export default Transmuxer
