import MediaSegmentFetcher from '../fetchers/media-segment-fetcher'
const url = require('url')

/**
 * A Segment is a media asset that can be downloaded to facilitate playback
 */
class Segment {

  constructor () { }

  get url () {
    if (this.uri.slice(0, 4) === 'http') {
      return this.uri
    } else {
      return url.parse([this.basePath, this.uri].join('/')).href
    }
  }

  fetch (onProgress) {
    this.fetchPromise = new Promise((resolve, reject) => {

      const progressWrapper = (progress) => {
        this.size       = progress.size
        this.downloaded = progress.downloaded
        this.progress   = progress.progress
        progress.uri    = this.uri
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
    return this.fetchPromise
  }

}

export default Segment
