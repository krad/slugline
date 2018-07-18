const http = require('http')
import { Playlist } from './playlist'

class Fetcher {
  constructor(config) {
    this._timeout   = config.timeout || 2000
    this._url       = config.url
  }

  fetch() {
    this._promise = new Promise((resolve, reject) => {

      const timer = setTimeout(() => {
        clearTimeout(timer)
        reject(new Error('fetch timed out'))
      }, this._timeout)

      var request = http.get(this._url, (response) => {
        var data = ''
        response.setEncoding('utf8')
        this._contentLength = response.headers['content-length']
        switch (response.statusCode) {
          case 404:
            reject(new Error('404 Not Found'))
            break
          case 200:
            response.on('data', (chunk) => {
              data += chunk
              this._contentRead = data.length
            })
            response.on('end', () => {
              clearTimeout(timer)
              resolve(data)
             })
            break
        }
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

  get contentRead() {
    if (this._contentRead) {
      return this._contentRead
    }
    return 0
  }

  get progress() {
    if (this.contentLength && this.contentRead) {
      return (this.contentLength / this.contentRead) * 100
    }
    return 0
  }
}

class PlaylistFetcher extends Fetcher {
  constructor(config) {
    super(config)
  }

  fetch() {
    return super.fetch().then(body => Playlist.parse(body))
  }
}

class MediaSegmetFetcher extends Fetcher {
  constructor(config) {
    super(config)
  }
}

export { Fetcher, PlaylistFetcher }
