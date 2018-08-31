import { PlaylistParser } from '../parsers/playlist/playlist-parser'
import { PlaylistFetcher } from '../fetchers/fetcher'

/**
 * Playlist is the base type for all supported playlists
 */
class Playlist {

  constructor(struct, body) {
    this.body = body
  }
  /**
   * @static parse - Parse a playlist body
   *
   * @param  {String} playlistBody The contents of a m3u8 playlist
   * @param  {Integer} startIdx Optional.  Will be the first integer used for MediaSegment ids
   * @return {Playlist}            Returns either a MediaPlaylist or a MasterPlaylist object
   */
  static parse (playlistBody, startIdx) {
    const idx = startIdx || 0
    return PlaylistParser.parse(playlistBody, idx)
  }

  /**
   * @static fetch - Fetch and parse a playlist from a URL
   *
   * @param  {String} playlistURL String to a URL that hosts a m3u8 playlist
   * @param  {Integer} startIdx Optional.  Will be the first integer used for MediaSegment ids
   * @return {Promise<Playlist>}  Returns a Promise with a
   */
  static fetch (playlistURL, startIdx) {
    let params = {
      url: playlistURL,
      startIdx: startIdx || 0
    }
    return new PlaylistFetcher(params).fetch()
  }

  set basePath (val) { this._basePath = val }
  get basePath () { return this._basePath }
}

export default Playlist
