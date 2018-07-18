const http = require('http')
import { Playlist } from './playlist'

class Fetcher {
  constructor(config) {
    this._timeout       = config.timeout || 5000
    this._url           = config.url
    this._contentRead   = 0
  }

  fetch(onProgress) {
    this._promise = new Promise((resolve, reject) => {

      const timer = setTimeout(() => {
        clearTimeout(timer)
        reject(new Error('fetch timed out'))
      }, this._timeout)

      const request = http.get(this._url, (response) => {
        if (this._encoding) { response.setEncoding(this._encoding) }
        this.headers        = response.headers
        this._contentLength = parseInt(this.headers['content-length'], 10)
        var data            = ''

        response.on('data', (chunk) => {
          data += chunk
          this._contentRead += chunk.length
          clearTimeout(timer)
          if (onProgress) { onProgress(this.progress) }
        }).on('end', () => {
          clearTimeout(timer)
          resolve(data)
        })
      })

      request.on('error', (err) => {
        clearTimeout(timer)
        reject(err)
      })

    })
    return this._promise
  }


  get contentLength() {
    if (this._contentLength) {
      return this._contentLength
    }
    return 0
  }

  get contentRead() { return this._contentRead }

  get progress() {
    if (this.contentLength && this.contentRead) {
      return +(100.0 * this.contentRead / this.contentLength).toFixed(2)
    }
    return 0
  }
}

class PlaylistFetcher extends Fetcher {
  constructor(config) {
    super(config)
    this._encoding = 'utf8'
  }

  fetch() { return super.fetch().then(body => Playlist.parse(body)) }
}

class MediaSegmetFetcher extends Fetcher {
  constructor(config) {
    super(config)
    this._encoding = 'binary'
  }
}

export { Fetcher, PlaylistFetcher, MediaSegmetFetcher }
