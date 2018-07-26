import { MediaSegmentFetcher } from '../fetchers/fetcher'
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
          console.log(err);
          reject(err)
        })
    })
  }

}

export default Segment
