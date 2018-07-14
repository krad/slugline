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
    if (info.title) { this.title = info.title }
    this.duration = info.duration
  }

  // get bitRate() { return this.size / this.duration }
}


export { MediaSegment, MediaInitializationSegment }
