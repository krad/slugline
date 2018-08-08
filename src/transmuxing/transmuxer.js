import * as atoms from './atoms'
import * as bytes from '../helpers/byte-helpers'
import ElementaryStream from '../parsers/container/ts/elementary-stream'

class Transmuxer {

  constructor() {
    this.currentOffset        = 0
    this.currentMediaSequence = 1
    this.decode               = 0
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

      if (chunk.isKeyFrame) {
        if (currentSequence) {
          let x = atoms.moof({payload: currentSequence})
          let y = atoms.build(x)
          this.currentOffset = y.length + (8*4)

          result.push({currentMediaSequence: this.currentMediaSequence++,
                                    payload: currentSequence,
                                    trackID: track.trackID,
                                 streamType: streamType,
                                     offset: this.currentOffset,
                                     decode: this.decode})

          this.decode += currentSequence.reduce((acc, curr) => acc + (curr.dts), 0)

        }
        currentSequence = [chunk]
      } else {
        if (currentSequence) {
          currentSequence.push(chunk)
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
