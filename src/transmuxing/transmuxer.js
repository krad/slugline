import * as atoms from './atoms'
import * as bytes from '../helpers/byte-helpers'
import ElementaryStream from '../parsers/container/ts/elementary-stream'
import AccessUnit from '../parsers/container/ts/access-unit'

class Transmuxer {

  constructor() {
    this.currentOffset        = 0
    this.currentMediaSequence = 1
    this.decode               = 0
  }

  setCurrentStream(ts) {
    this.currentStream = ts
    const pes          = ElementaryStream.parse(ts, 27, 1)
    const videoStruct  = AccessUnit.parse(pes)

    this.videoStruct      = AccessUnit.parse(pes)
    this.videoStruct.id   = 1
    this.videoStruct.type = 27

  }

  buildInitializationSegment() {

    const config = [this.videoStruct]

    let result = []
    result.push(atoms.ftyp())
    result.push(atoms.moov(config))
    result = result.map(a => atoms.build(a))
    return bytes.concatenate(Uint8Array, ...result)
  }

  buildSequences(streamType) {
    let result = []
    let currentSequence

    this.videoStruct.units.forEach(chunk => {

      if (chunk.isKeyFrame) {
        if (currentSequence) {
          let x = atoms.moof({payload: currentSequence})
          let y = atoms.build(x)
          this.currentOffset = y.length + (8*4)

          result.push({currentMediaSequence: this.currentMediaSequence++,
                                    payload: currentSequence,
                                    trackID: 1,
                                 streamType: streamType,
                                     offset: this.currentOffset,
                                     decode: this.decode})

          let previousPTS = 0
          let durations = []
          currentSequence.forEach(au => {
            const duration = Math.floor(au.pts - previousPTS)

            previousPTS    = au.pts
            if (duration > 3005) {
              durations.push(3000)
            } else {
              durations.push(duration)
            }

          })

          this.decode += durations.reduce((a, c) => a + c, 0)

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

  buildMediaSegment() {
    const sequences = this.buildSequences(27)
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
