import Fetcher from './fetcher'
import { Playlist } from '../playlist'

/**
 * PlaylistFetcher can be used to fetch and parse a playlist
 */
class PlaylistFetcher extends Fetcher {
  constructor (config) {
    super(config)
    this.encoding = 'utf8'
  }

  /**
   * fetch - Fetch the playlist
   *
   * @return {Promise<Playlist>} A promise with either a MediaPlaylist or a MasterPlaylist
   */
  fetch () {
    return super.fetch()
      .then(body => Playlist.parse(body))
      .then(playlist => {
        playlist.url      = this.url
        playlist.headers  = this.headers
        playlist.basePath = this.url.split('/').slice(0, -1).join('/')
        return playlist
      })
  }
}

export default PlaylistFetcher
