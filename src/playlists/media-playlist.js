import Playlist from './base-playlist'
import { configureMediaPlaylist } from '../parsers/playlist/playlist-parser'
import TransportStream from '../parsers/container/ts/transport-stream'
import ElementaryStream from '../parsers/container/ts/elementary-stream'
import Transmuxer from '../transmuxing/transmuxer'

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

  constructor (playlistStruct, body) {
    super(playlistStruct, body)
    this._ended   = false
    this.segments = []
    configureMediaPlaylist(this, playlistStruct)
  }

  set basePath (val) {
    super.basePath = val
    this.segments.forEach(segment => segment.basePath = val)
  }

  get basePath () { return this._basePath }

  /**
   * get type - The type of playlist (VOD, EVENT, LIVE)
   *
   * @return {String}  String describing the type of playlist
   */
  get type () {
    if (this._type) {
      return this._type
    }

    if (!this.ended) { return 'LIVE' }
  }


  /**
   * get totalDuration - The duration of all segments in the playlist
   *
   * @return {Float} Number of seconds of all durations in the playlist
   */
  get totalDuration () {
    return this.segments
      .filter(segment => {
        return segment.constructor.name == 'MediaSegment'
      })
      .reduce((acc, curr) => {
        return acc + curr.duration
      }, 0)
  }

  /**
   * get avgDuration - Averate duration across all segments
   *
   * @return {Float} The average of all the segments in the playlist
   */
  get avgDuration() {
    return this.totalDuration / this.segments.length
  }

  /**
   * get refreshInterval - The rate at which we will auto-refresh a playlist
   *
   * @return {Integer} Number of miliseconds to wait between auto refresh requests
   */
  get refreshInterval() {
    // It MUST be made available relative to the time that the previous version of the Playlist file
    // was made available: no earlier than one-half the target duration
    // after that time, and no later than 1.5 times the target duration
    // after that time.
    // TODO: possibly use cache/etags to handle this better?
    if (this.avgDuration < (this.targetDuration/2) || this.avgDuration > (this.targetDuration*1.5)) {
      return this.targetDuration * 1000
    }
    return this.avgDuration * 1000
  }

  startAutoRefresh(onRefresh) {
    this.onRefresh    = onRefresh
    this.refresh      = this.refresh.bind(this)
    this.refreshTimer = setInterval(this.refresh, this.refreshInterval)
  }

  stopAutoRefresh() {
    clearInterval(this.refreshTimer)
    delete this['refreshTimer']
  }

  /**
   * get ended - A bool marking if the stream is ended/complete (VOD playlists / Complete EVENT playlists)
   *
   * @return {bool} true if the playlist is complete
   */
  get ended () { return this._ended }

  set ended(val) {
    this._ended = val
    // If we have ended and there is a timer, clear it.
    if (this._ended && this.refreshTimer) { this.stopAutoRefresh() }
  }

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


  /**
   * fetchSequentially - Fetch segments in the playlist one at a time
   *
   * @param  {Function} onNext     Callback executed before each fetch
   * @param  {Function} onProgress Callback executed as a segment downloads
   * @return {Promise<Playlist>}   Returns a promise the fulfills with the mutated playlist
   */
  fetchSequentially(onNext, onProgress) {
    return new Promise((resolve, reject) => {

      const fetch = (idx) => {
        const progressWrapper = (progress) => {
          if (onProgress) { onProgress(Object.assign(progress, {uri: segment.uri})) }
        }

        const segment = this.segments[idx]
        if (segment) {
          onNext(segment)
          segment.fetch(progressWrapper).then(res => fetch(idx+1)).catch(err => reject(err))
        } else {
          resolve(this)
        }
      }

      fetch(0)

    })
  }


  /**
   * refresh - Refetch the playlist and update all relevant values
   *
   * @return {Promise<Playlist>} Will return a reference to the current playlist (mutated)
   */
  refresh() {
    return new Promise((resolve, reject) => {
      if ((this.type != 'LIVE' && this.type != 'EVENT') || this.ended) {
        reject("Can't refresh playlist")
      }

      Playlist.fetch(this.url).then(refreshedPlaylist => {
        this.updateSegments(refreshedPlaylist.segments)
        this.ended               = refreshedPlaylist.ended
        this.mediaSequenceNumber = refreshedPlaylist.mediaSequenceNumber
        if (this.onRefresh) { this.onRefresh(this) }
        resolve(this)
      }).catch(err => reject(err))

    })
  }

  /**
   * getCodecsInformation - If no codec information is attached to the playlist this will
   * either download the first segment and attempt to determine what it is.
   * In playlists that contain fragmented mp4's this is an init segment which is typically about 1.4k in size
   * In playlists that contain transport streams, this is usually a full media segment
   *
   * @return {Promise<Object>} Returns a promise the resolves to an object containing codec information
   */
  getCodecsInformation() {
    return new Promise((resolve, reject) => {
      if (this.codecs) { resolve(this.codecs) }
      if (!this.segments) { reject('No segments in playlist') }
      if (this.segments.length <= 0) { reject('No segments in playlist') }

      const initSegments = this.segments.filter(s => s.constructor.name === 'MediaInitializationSegment')
      if (initSegments.length > 0) {
        const initSegment = initSegments[0]
        initSegment.fetch().then(s => {
          this.segmentsType = 'fmp4'
          this.codecs       = initSegment.codecs.codecs
          this.codecsString = initSegment.codecs.codecsString
          resolve(initSegment.codecs.codecs)
        }).catch(err => {
          reject(err)
        })
        return

      } else {

        if (this.segments.count <= 0) { reject('Playlist had no segments.') }
        const firstSegment = this.segments[0]

        firstSegment.fetch().then(s => {
          this.segmentsType   = 'ts'
          const ts            = TransportStream.parse(s)
          this.codecs         = ts.trackPackets.map(tp => tp.codec)
          this.codecsString   = ts.codecsString
          resolve(this.codecs)
        }).catch(err => {
          console.log('failed to fetch first segment', err);
          reject(err)
        })

      }
    })
  }

  /**
   * updateSegments - Used by refresh to only replace entries in the segment array that have changed.
   * This prevents data from being blown away whenever we're interacting with live or event placelists
   * VOD playlists can just use the setter
   *
   * @param  {Array<Segment>} segments An array of segments
   */
  updateSegments(segments) {
    let results = []
    var startsWithInitSegment = false
    for (var i = 0; i < segments.length; i++) {
      var oldSegment   = this.segments[i]
      const newSegment = segments[i]

      if (i == 0) {
        if (oldSegment.constructor.name === 'MediaSegment' &&
            newSegment.constructor.name === 'MediaSegment')
        {
          startsWithInitSegment = false
          oldSegment = this.segments[i+1]
        } else {
          startsWithInitSegment = true
        }
      }

      if (this.type == 'LIVE') {
        if (i > 0) { oldSegment = this.segments[i+1] }
      }

      if (oldSegment) {
        if (newSegment.uri == oldSegment.uri) {
          results.push(oldSegment)
        } else {
          results.push(newSegment)
        }
      } else {
        results.push(newSegment)
      }
    }
    this.segments = results
  }
}


export default MediaPlaylist
