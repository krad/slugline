import {
  Parser,
  configureMediaPlaylist,
  configureMasterPlaylist,
  configureVariantStream,
  configureRendition } from './parser'

import { PlaylistFetcher } from './fetcher'

/**
 * Playlist is the base type for all supported playlists
 */
class Playlist {

  /**
   * @static parse - Parse a playlist body
   *
   * @param  {String} playlistBody The contents of a m3u8 playlist
   * @return {Playlist}            Returns either a MediaPlaylist or a MasterPlaylist object
   */
  static parse(playlistBody) {
    return Parser.parse(playlistBody)
  }

  /**
   * @static fetch - Fetch and parse a playlist from a URL
   *
   * @param  {String} playlistURL String to a URL that hosts a m3u8 playlist
   * @return {Promise<Playlist>}  Returns a Promise with a
   */
  static fetch(playlistURL) {
    const fetcher = new PlaylistFetcher({url: playlistURL})
    return fetcher.fetch()
  }

  set basePath(val) { this._basePath = val }
  get basePath() { return this._basePath }

}


/**
 * A Media Playlist contains a list of Media Segments, which when played
   sequentially will play the multimedia presentation.

   Here is an example of a Media Playlist:

   #EXTM3U
   #EXT-X-TARGETDURATION:10

   #EXTINF:9.009,
   http://media.example.com/first.ts
   #EXTINF:9.009,
   http://media.example.com/second.ts
   #EXTINF:3.003,
   http://media.example.com/third.ts
 */
class MediaPlaylist extends Playlist {

  constructor(playlistStruct) {
    super()
    this._ended   = false
    this.segments = []
    configureMediaPlaylist(this, playlistStruct)
  }

  set basePath(val) {
    super.basePath = val
    this.segments.forEach(segment => segment.basePath = val)
  }

  get basePath() { return this._basePath }

  /**
   * get type - The type of playlist (VOD, EVENT, LIVE)
   *
   * @return {String}  String describing the type of playlist
   */
  get type() { return this._type }

  get totalDuration() {
    return this.segments
    .filter(segment => {
      return segment.constructor.name == 'MediaSegment'
    }).
    reduce((acc, curr) => {
      return acc + curr.duration
    }, 0)
  }

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
  // get peakBitRate() {
  //   return undefined
  // }

  // The average segment bit rate of a Media Playlist is the sum of the
  //   sizes (in bits) of every Media Segment in the Media Playlist, divided
  //   by the Media Playlist duration.  Note that this includes container
  //   overhead, but not HTTP or other overhead imposed by the delivery
  //   system.
  // get avgBitRate() {
  //   return undefined
  // }

}

/**
 * A Master Playlist provides a set of Variant Streams, each of which
   describes a different version of the same content.

   A Variant Stream includes a Media Playlist that specifies media
   encoded at a particular bit rate, in a particular format, and at a
   particular resolution for media containing video.

   A Variant Stream can also specify a set of Renditions.  Renditions
   are alternate versions of the content, such as audio produced in
   different languages or video recorded from different camera angles.

   Clients should switch between different Variant Streams to adapt to
   network conditions.  Clients should choose Renditions based on user
   preferences.

 */
class MasterPlaylist extends Playlist {
  constructor(playlistStruct) {
    super()
    this.variants = []
    configureMasterPlaylist(this, playlistStruct)
  }


  /**
   * get regularVariants - Get variant streams that are regular
   *
   * @return {Array<VariantStream>}  An array of variant streams that are 'regular' non-iFrame
   */
  get regularVariants() {
    return this.variants.filter(vs => vs.isIFrame == false)
  }


  /**
   * get iFrameVaraints - Get variant streams that are iFrame only
   *
   * @return {Array<VariantStream>} An array of variant streams that are iFrame only
   */
  get iFrameVaraints() {
    return this.variants.filter(vs => vs.isIFrame == true)
  }
}

class VariantStream {
  constructor(streamInfo) {
    this.isIFrame   = false
    this.bandwidth  = streamInfo['BANDWIDTH']
    configureVariantStream(this, streamInfo)
  }
}

class Rendition {
  constructor(renditionInfo) {
    configureRendition(this, renditionInfo)
  }
}

export { Playlist, MediaPlaylist, MasterPlaylist, VariantStream, Rendition }
