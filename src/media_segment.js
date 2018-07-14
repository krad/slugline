class Segment {
  constructor() { }

  set uri(val) { this._uri = val }
  get uri() { return this._uri }

}

class MediaInitializationSegment extends Segment {
  constructor(uri) {
    super()
    this._uri = uri
  }
}

class MediaSegment extends Segment {
  constructor(info) {
    super()
    // this.mediaSequenceNumber = undefined
    // this.bitRate             = undefined
    this.duration            = info.duration
    if (info.title) { this.title = info.title }
    // this.size                = undefined
    // this.title               = undefined // #EXTINF:<duration>,[<title>]
  }

  // get bitRate() { return this.size / this.duration }
}


export { MediaSegment, MediaInitializationSegment }
