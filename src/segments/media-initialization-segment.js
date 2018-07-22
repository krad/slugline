import Segment from './segment'

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
}

export default MediaInitializationSegment
