import { Playlist } from '../playlist'
import { configureVariantStream } from '../parsers/playlist/playlist-parser'
const url = require('url')

class VariantStream {

  constructor (streamInfo) {
    this.isIFrame = false
    this.bandwidth = streamInfo['BANDWIDTH']
    configureVariantStream(this, streamInfo)
  }

  get url () {
    if (this.uri.slice(0, 4) === 'http') {
      return this.uri
    } else {
      if (this.basePath) {
        return url.parse([this.basePath, this.uri].join('/')).href
      } else {
        return undefined
      }
    }
  }

  fetch() { return Playlist.fetch(this.url) }

}

export default VariantStream
