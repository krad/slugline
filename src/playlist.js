class Playlist {

  constructor() { }
}

class MediaPlaylist extends Playlist {

  constructor(data) {
    super()
    this.segments = []
  }

 //  The peak segment bit rate of a Media Playlist is the largest bit rate
 // of any contiguous set of segments whose total duration is between 0.5
 // and 1.5 times the target duration.  The bit rate of a set is
 // calculated by dividing the sum of the segment sizes by the sum of the
 // segment durations.
  get peakBitRate() {
    return undefined
  }

  // The average segment bit rate of a Media Playlist is the sum of the
  //   sizes (in bits) of every Media Segment in the Media Playlist, divided
  //   by the Media Playlist duration.  Note that this includes container
  //   overhead, but not HTTP or other overhead imposed by the delivery
  //   system.
  get avgBitRate() {
    return undefined
  }

}

class MasterPlaylist extends Playlist {
  constructor() {
    super()
  }
}

class VariantStream {
  constructor() {

  }
}

class Rendition {
  constructor() {

  }
}

class MediaInitializationSection {
  constructor() {

  }
}

class MediaSegment {
  constructor() {
    this.mediaSequenceNumber = 0
    this.bitRate             = 0
    this.duration            = 0
    this.size                = 0
    this.title               = undefined // #EXTINF:<duration>,[<title>]
  }

  get bitRate() {
    return this.size / this.duration
  }
}


export { MediaPlaylist, MasterPlaylist }
