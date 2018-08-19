import * as atoms from './atoms'
import * as bytes from '../helpers/byte-helpers'
import ElementaryStream from '../parsers/container/ts/elementary-stream'
import { keyframeIterator } from '../parsers/container/ts/access-unit'

class Transmuxer {

  constructor() {
    this.currentOffset        = 0
    this.currentMediaSequence = 1
    this.videoDecode          = 0
    this.audioDecode          = 0
  }

  setCurrentStream(ts) {
    this.currentStream = ts
    this.streamTypes   = ts.tracks.map(track => track.streamType)
    if (this.hasVideo) {
      this.videoTrack = this.currentStream.tracks.filter(track => track.streamType === 27)[0]
      this.videoIterator = keyframeIterator(this.videoTrack.units)
    }

    if (this.hasAudio) {
      this.audioTrack = this.currentStream.tracks.filter(track => track.streamType === 15)[0]
    }
  }

  hasAudio() {
    return this.streamTypes.includes(15)
  }

  hasVideo() {
    return this.streamTypes.includes(27)
  }

  nextMoof() {
    let result = {currentMediaSequence: this.currentMediaSequence++, tracks: []}

    let videoConfig  = Object.assign({}, this.videoTrack)
    delete videoConfig.units
    const videoSamples = this.videoIterator.next()
    if (videoSamples === undefined) { return undefined }
    videoConfig.samples = videoSamples
    result.tracks.push(videoConfig)

    let first = videoConfig.samples[0]
    let last  = videoConfig.samples.slice(-1)[0]
    let audioSamplesForChunk = []
    this.audioTrack.units.forEach(sample => {
      if (sample.packet.pts >= first.packet.pts && sample.packet.pts <= last.packet.pts+6000) {
        audioSamplesForChunk.push(sample)
      }
    })

    // console.log(audioSamplesForChunk.slice(-1)[0].header);

    // this.audioTrack.units.forEach(s => {
    //   // console.log(s.payload.slice(0, 10), s.payload.slice(-10, -1))
    //   console.log(s.payload.slice(-20, -1));
    // })
    //
    // // console.log(first.packet.pts, last.packet.pts);
    console.log(audioSamplesForChunk.map(s => [s.id, s.packet.pts]));
    // console.log(last.packet.pts - first.packet.pts);
    // console.log(first.packet.pts, last.packet.pts);

    let audioConfig     = Object.assign({}, this.audioTrack)
    if (audioSamplesForChunk.length > 0) {
      audioConfig.samples = audioSamplesForChunk
      let firstSample = audioConfig.samples[0]
      if (firstSample) {
        audioConfig.sampleRate     = firstSample.header.samplingRate
        audioConfig.channelConfig  = firstSample.header.channelConfig
        audioConfig.profile        = firstSample.header.profileMinusOne+1
        delete audioConfig.units
        result.tracks.push(audioConfig)
      } else {
        result.tracks.push({samples:[], trackID: 2, streamType: 15})
      }
    }

    /// Build the moof so we know where it ends and the mdat should begin
    let x = atoms.moof(result)
    let y = atoms.build(x)
    this.currentOffset = y.length + (8)


    result.tracks[0].offset = this.currentOffset
    result.tracks[0].decode = this.videoDecode
    this.videoDecode += videoConfig.samples.reduce((a, c) => a + c.duration, 0)

    if (audioSamplesForChunk.length > 0) {
      // bump the offset so the audio track knows where to start
      this.currentOffset += videoConfig.samples.reduce((a, c) => a + c.length, 0)
      result.tracks[1].offset = this.currentOffset
      result.tracks[1].decode = this.audioDecode
      this.audioDecode += audioConfig.samples.reduce((a, c) => a + c.duration, 0)
    }

    return result
  }

  build() {
    let result = []
    while(1) {
      let moof = this.nextMoof()
      if (moof === undefined) { break }
      result.push(moof)
    }
    return result
  }


  buildInitializationSegment(moof) {
    let result = []
    result.push(atoms.ftyp())
    result.push(atoms.moov(moof))
    result = result.map(a => atoms.build(a))
    return bytes.concatenate(Uint8Array, ...result)
  }

  buildMediaSegment(moofs) {
    let result = []

    moofs.forEach(moof => {
      // console.log(moof.tracks[0].samples);
      result.push(atoms.moof(moof))
      result.push(atoms.mdat(moof))
    })
    result = result.map(a => atoms.build(a))
    return bytes.concatenate(Uint8Array, ...result)
  }

}

const parseAudioTrack = (audioTrack) => {

}

export default Transmuxer
