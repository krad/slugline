import { Parser } from './parser'
import { MediaSegment, MediaInitializationSegment } from './media_segment'

class Playlist {

  static parse(playlistBody) {
    return Parser.parse(playlistBody)
  }

}

class MediaPlaylist extends Playlist {

  constructor(playlistStruct) {
    super()
    this._ended   = false
    this.segments = []

    var currentSegment     = undefined
    playlistStruct.forEach(tag => {
      if (typeof tag === 'string') {

        if (tag === '#EXT-X-ENDLIST') {
          this._ended = true
        } else {
          if (currentSegment) {
            currentSegment.uri = tag
            this.segments.push(currentSegment)
            currentSegment = undefined
          }
        }
      }

      if (typeof tag == 'object') {
        if (tag['#EXT-X-MAP']) {
          if (tag['#EXT-X-MAP']['URI']) {
            this.segments.push(new MediaInitializationSegment(tag['#EXT-X-MAP']['URI']))
          }
        }

        if (tag['#EXTINF']) {
          currentSegment = new MediaSegment(tag['#EXTINF'])
        }

        if (tag['#EXT-X-TARGETDURATION']) {
          this.targetDuration = tag['#EXT-X-TARGETDURATION']
        }

        if (tag['#EXT-X-VERSION']) {
          this.version = tag['#EXT-X-VERSION']
        }

        if (tag['#EXT-X-PLAYLIST-TYPE']) {
          this._type = tag['#EXT-X-PLAYLIST-TYPE']
        }

        if (tag['#EXT-X-MEDIA_SEQUENCE']) {
          this.mediaSequenceNumber = tag['#EXT-X-MEDIA_SEQUENCE']
        }
      }
    })

  }


  /**
   * get type - The type of playlist (VOD, EVENT, LIVE)
   *
   * @return {String}  String describing the type of playlist
   */
  get type() { return this._type }


  /**
   * get ended - A bool marking if the stream is ended/complete (VOD playlists / Complete EVENT playlists)
   *
   * @return {bool} true if the playlist is complete
   */
  get ended() { return this._ended }

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

export { Playlist, MediaPlaylist, MasterPlaylist }
