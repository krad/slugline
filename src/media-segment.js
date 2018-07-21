import { MediaSegmentFetcher } from './fetcher'
const url = require('url')

/**
 * A Segment is a media asset that can be downloaded to facilitate playback
 */
class Segment {
  constructor () { }

  get url () {
    return url.parse([this.basePath, this.uri].join('/')).href
  }

  fetch (onProgress) {
    return new Promise((resolve, reject) => {

      const progressWrapper = (progress) => {
        this.size       = progress.size
        this.downloaded = progress.downloaded
        this.progress   = progress.progress
        if (onProgress) { onProgress(progress) }
      }

      this.isDownloading = true
      const fetcher =  new MediaSegmentFetcher({url: this.url})
      fetcher.fetch(progressWrapper)
        .then(res => {
          this.size          = res.length
          this.data          = res
          this.isDownloading = false
          this.headers       = fetcher.headers
          resolve(res)
        }).catch(err => {
          reject(err)
        })
    })
  }

}

class MediaInitializationSegment extends Segment {
  constructor (info) {
    super()
    this.uri = info['URI']

    if (info['BYTERANGE']) {
      this.byteRange = info['BYTERANGE']
    }
  }
}

class MediaSegment extends Segment {
  constructor (info) {
    super()
    if (info.title) { this.title = info.title }
    this.duration = info.duration
  }

  fetch (onProgress) {
    return super.fetch(onProgress).then(res => {
      this.bitRate = this.size / this.duration
      return res
    })
  }
}

export { MediaSegment, MediaInitializationSegment }
