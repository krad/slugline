import Segment from './segment'

class MediaSegment extends Segment {
  constructor (info) {
    super()
    if (info.title) { this.title = info.title }
    this.duration = info.duration
  }

  fetch (onProgress) {
    return super.fetch(onProgress).then(res => {
      this.bitRate = this.size / this.duration
      return res
    })
  }
}

export default MediaSegment
