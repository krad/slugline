import * as atoms from './atoms'
import * as bytes from '../helpers/byte-helpers'
import ElementaryStream from '../parsers/container/ts/elementary-stream'

class Transmuxer {

  constructor() {
    this.decodeCount          = 0
    this.currentOffset        = 0
    this.currentMediaSequence = 1
  }

  buildInitializationSegment(ts) {
    let result = []
    result.push(atoms.ftyp())
    result.push(atoms.moov(ts.tracksConfig))
    result = result.map(a => atoms.build(a))
    return bytes.concatenate(Uint8Array, ...result)
  }

  buildSequences(ts, streamType) {
    let result    = []
    let track     = ts.tracks.filter(t => t.streamType == streamType)[0]
    let currentSequence
    track.chunks.forEach(chunk => {
      const nalu      = chunk.nalu
      const naluType  = nalu[0] & 0x1f
      if (naluType === 1) {
        if (currentSequence) {
          if (chunk.pcrBase) { this.decodeCount +=  ((chunk.pcrBase >> 9) / 90000) }
          currentSequence.push(chunk)
        }
      }

      if (naluType === 5) {
        if (currentSequence && currentSequence.length > 1) {
          let offset          = currentSequence.reduce((acc, curr) => acc + curr.nalu.length, 0)
          const padding       = 0 // 4 + 4 + 4 + 8 + 8 + 8 + 8 + 4 + 4 + 4 + 4 + 4 + 4
          this.currentOffset += (offset) + padding
          result.push({currentMediaSequence: this.currentMediaSequence++,
                                    payload: currentSequence,
                                    trackID: track.trackID,
                                 streamType: streamType,
                                     offset: this.currentOffset})
        }
        chunk.decode      = this.decodeCount
        currentSequence   = [chunk]
        if (chunk.pcrBase) {
          this.decodeCount += ((chunk.pcrBase >> 9) / 90000)
        }
      }

    })

    return result
  }

  buildMediaSegment(ts) {
    const sequences = this.buildSequences(ts, 27)

    let result = []
    sequences.forEach(seq => {
      result.push(atoms.moof(seq))
      result.push(atoms.mdat(seq))
    })
    result = result.map(a => atoms.build(a))
    return bytes.concatenate(Uint8Array, ...result)
  }

}

export default Transmuxer
