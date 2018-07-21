import { configureVariantStream } from '../parsers/playlist/playlist-parser'

class VariantStream {
  constructor (streamInfo) {
    this.isIFrame = false
    this.bandwidth = streamInfo['BANDWIDTH']
    configureVariantStream(this, streamInfo)
  }
}

export default VariantStream
