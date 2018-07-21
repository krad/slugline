import { configureRendition } from '../parsers/playlist/playlist-parser'

class Rendition {
  constructor (renditionInfo) {
    configureRendition(this, renditionInfo)
  }
}

export default Rendition
