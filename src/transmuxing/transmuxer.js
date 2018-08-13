import * as atoms from './atoms'
import * as bytes from '../helpers/byte-helpers'
import ElementaryStream from '../parsers/container/ts/elementary-stream'

class Transmuxer {

  constructor() {
    this.currentOffset        = 0
    this.currentMediaSequence = 1
    this.decode               = 0
  }

  setCurrentStream(ts) {
    this.currentStream = ts
  }

  buildInitializationSegment() {
    let result = []
    result.push(atoms.ftyp())
    result.push(atoms.moov(this.currentStream.tracks))
    result = result.map(a => atoms.build(a))
    return bytes.concatenate(Uint8Array, ...result)
  }

  buildSequences(streamType) {
    let result = []

    this.currentStream.tracks.forEach(track => {
      if (track.streamType === 27) {
        console.log(this.parseVideoTrack(track))
      }

      if (track.streamType === 15) {
        parseAudioTrack(track)
      }
    })

    // this.videoStruct.units.forEach(chunk => {
    //
    //   if (chunk.isKeyFrame) {
    //     if (currentSequence) {
    //       let x = atoms.moof({payload: currentSequence})
    //       let y = atoms.build(x)
    //       this.currentOffset = y.length + (8*4)
    //
    //       result.push({currentMediaSequence: this.currentMediaSequence++,
    //                                 payload: currentSequence,
    //                                 trackID: 1,
    //                              streamType: streamType,
    //                                  offset: this.currentOffset,
    //                                  decode: this.decode})
    //
    //       let previousPTS = 0
    //       let durations = []
    //       currentSequence.forEach(au => {
    //         const duration = Math.floor(au.pts - previousPTS)
    //
    //         previousPTS    = au.pts
    //         if (duration > 3005) {
    //           durations.push(3000)
    //         } else {
    //           durations.push(duration)
    //         }
    //
    //       })
    //
    //       this.decode += durations.reduce((a, c) => a + c, 0)
    //
    //     }
    //     currentSequence = [chunk]
    //   } else {
    //     if (currentSequence) {
    //       currentSequence.push(chunk)
    //     }
    //   }
    // })

    return result
  }

  parseVideoTrack(videoTrack) {
    let result = []
    let currentMoof
    videoTrack.units.forEach(au => {
      if (au.isKeyFrame) {
        if (currentMoof) {

          let x = atoms.moof({payload: currentMoof})
          let y = atoms.build(x)
          this.currentOffset = y.length + (8*4)

          result.push({currentMediaSequence: this.currentMediaSequence++,
                                    payload: currentMoof,
                                    trackID: 1,
                                 streamType: 27,
                                     offset: this.currentOffset,
                                     decode: this.decode})


        } else {
          currentMoof = [au]
        }
      } else {
        if (currentMoof) {
          currentMoof.push(au)
        }
      }
    })
    return result
  }

  buildMediaSegment() {
    const sequences = this.buildSequences()
    let result = []
    sequences.forEach(seq => {
      result.push(atoms.moof(seq))
      result.push(atoms.mdat(seq))
    })
    result = result.map(a => atoms.build(a))
    return bytes.concatenate(Uint8Array, ...result)
  }

}

const parseAudioTrack = (audioTrack) => {

}

export default Transmuxer
