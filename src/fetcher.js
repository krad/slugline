const http = require('http')
import { Playlist } from './playlist'

class Fetcher {

  static fetch(config) {
    const fetcher = new this(config)
    return fetcher.fetch()
  }

  constructor(config) {
    this._timeout       = config.timeout || 5000
    this._url           = config.url
    this._contentRead   = 0
    this.retryCount     = config.retryCount || 0
  }

  fetch(onProgress) {
    const execute = () => {
      const onResponse = (resp) => {this.headers = resp.headers }
      const params     = { url: this.url,
                        timeout: this.timeout,
                      onProgress: onProgress,
                      onResponse: onResponse,
                        encoding: this.encoding}

        return simpleGet(params)
        .then(res => Promise.resolve(res))
        .catch(err => retry(execute, this.retryCount, err))
      }
    return execute()
  }

  get url() {
    return this._url
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

const retry = (fn, retryCount, err) => {
  if (retryCount == 0) { return Promise.reject(err) }
  return fn().catch(err => { return retry(fn (retryCount - 1), err) })
}

const simpleGet = (params) => {

  const url         = params.url
  const timeout     = params.timeout  || 5000
  const onProgress  = params.onProgress || (() => {})
  const onResponse  = params.onResponse || (() => {})
  const encoding    = params.encoding || 'utf8'

  return new Promise((resolve, reject) => {

    const setupTimer = (timer, timeout) => {
      clearTimeout(timer)
      return setTimeout(() => { reject(new Error('fetch timed out')) }, timeout)
    }

    var timer = setupTimer(undefined, timeout)

    const request = http.get(url, (response) => {
      // Call the onResponse callback
      onResponse(response)

      if (response.statusCode != 200) {
        // Reject if we didn't get 200
        reject(response.statusCode)
      } else {
        // Set the encoding
        response.setEncoding(encoding)

        // Save the content length
        const contentLength = parseInt(response.headers['content-length'], 10)

        var data = ''
        response.on('data', (chunk) => {
          // Reset timeout so we don't die on long downloads
          timer = setupTimer(timer, timeout)

          // Append the chunk to the result
          data += chunk

          // Call the onProgress callback if present
          onProgress({size: contentLength, downloaded: data.length})

        }).on('end', () => {

          clearTimeout(timer)
          resolve(data)

        })

      }
    })

    // Reject based on some other error
    request.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })

  })
}


/**
 * PlaylistFetcher can be used to fetch and parse a playlist
 */
class PlaylistFetcher extends Fetcher {
  constructor(config) {
    super(config)
    this._encoding = 'utf8'
  }

  fetch() {
    return super.fetch()
    .then(body => Playlist.parse(body))
    .then(playlist => {
      playlist.basePath = this.url.split('/').slice(0, -1).join('/')
      return playlist
    })
  }
}


/**
 * MediaSegmentFetcher can be used to fetch a media segment
 */
class MediaSegmetFetcher extends Fetcher {
  constructor(config) {
    super(config)
    this._encoding = 'binary'
  }
}

export { Fetcher, PlaylistFetcher, MediaSegmetFetcher }
