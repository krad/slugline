const url = require('url')
import { MediaSegmentFetcher } from './fetcher'


/**
 * A Segment is a media asset that can be downloaded to facilitate playback
 */
class Segment {
  constructor() { }

  get url() {
    return url.parse([this.basePath,this.uri].join('/')).href
  }

  get progress() {
    if (this._fetcher) {
      return this._fetcher.progress
    }
    return 0
  }

  fetch(onProgress) {
    return new Promise((resolve, reject) => {
      this._fetcher = new MediaSegmentFetcher({url: this.url})
      this._fetcher.fetch(onProgress)
      .then(res => {
        this.size = res.length
        this.data = res
        resolve(res)
      }).catch(err => {
        reject(err)
      })
    })
  }

  /**
   * get downloaded - How much of the segment has been downloaded
   *
   * @return {Inteer} Number of bytes that have been downloaded
   */
  get downloaded() {
    if (this._fetcher) {
      return this._fetcher.contentRead
    }
    return 0
  }

}


class MediaInitializationSegment extends Segment {
  constructor(uri) {
    super()
    this.uri = uri
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
