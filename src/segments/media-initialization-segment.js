import Segment from './segment'
import MPEGParser from '../parsers/container/mpeg-parser'

/**
 * A MediaInitializationSegment represents a media asset that contains information
 * used to initialize an audio/video decoder
 */
class MediaInitializationSegment extends Segment {
  constructor (info) {
    super()
    this.uri      = info['URI']
    this.objType  = 'MediaInitializationSegment'

    if (info['BYTERANGE']) {
      this.byteRange = info['BYTERANGE']
    }
  }

  fetch(onProgress) {
    let segmentData
    return super.fetch(onProgress).then(segment => {
      segmentData = segment
      return MPEGParser.parse(segment)
    }).then(parsedSegment => {
      this.codecs = {codecs: parsedSegment.codecs, codecsString: parsedSegment.codecsString}
      return segmentData
    })
  }
}

export default MediaInitializationSegment
