const url = require('url')
import { MediaSegmetFetcher } from './fetcher'


/**
 * A Segment is a media asset that can be downloaded to facilitate playback
 */
class Segment {
  constructor() { }

  set uri(val) { this._uri = val }
  get uri() { return this._uri }

  get url() {
    return url.parse([this.basePath,this._uri].join('/')).href
  }

  get progress() {
    if (this._fetcher) {
      return this._fetcher.progress
    }
    return 0
  }

  fetch() {
    return new Promise((resolve, reject) => {
      this._fetcher = new MediaSegmetFetcher({url: this.url})
      this._fetcher.fetch()
      .then(res => {
        this.size = res.length
        this.data = res
        resolve(res)
      }).catch(err => {
        reject(err)
      })
    })
  }

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

  get bitRate() { return this.size / this.duration }
}


export { MediaSegment, MediaInitializationSegment }
