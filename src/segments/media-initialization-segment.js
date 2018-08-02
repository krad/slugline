import Segment from './segment'
import MPEGParser from '../parsers/container/mpeg-parser'

/**
 * A MediaInitializationSegment represents a media asset that contains information
 * used to initialize an audio/video decoder
 */
class MediaInitializationSegment extends Segment {
  constructor (info) {
    super()
    this.uri = info['URI']

    if (info['BYTERANGE']) {
      this.byteRange = info['BYTERANGE']
    }
  }

  fetch(onProgress) {
    return super.fetch(onProgress).then(segment => {
      return MPEGParser.parse(segment)
    }).then(parsedSegment => {
      return {codecs: parsedSegment.codecs, codecsString: parsedSegment.codecsString}
    })
  }
}

export default MediaInitializationSegment
