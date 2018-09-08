const https = require('https')
const http  = require('http')
const url   = require('url')

/**
 * Base class for performing fetches for playlists and assets defined in them
 */
export default class Fetcher {
  /**
   * @static fetch - static method used
   *
   * @param  {Object} config Object containing configuration data for the fetch
   * @return {Promise<Result>} Returns a promise with self contained retry logic
   */
  static fetch (config) {
    const fetcher = new this(config)
    return fetcher.fetch()
  }

  constructor (config) {
    this.timeout = config.timeout || 5000
    this._url = config.url
    this.contentRead = 0
    this.encoding = config.encoding || 'utf8'
    this.followRedirects = config.followRedirects || true
    this.redirects = []

    // The maximum amount of times to retry
    this.maxRetries = config.maxRetries
    if (this.maxRetries == undefined) { this.maxRetries = 1 }

    // The number of fetches made.
    this.fetchCount = 0
  }

  /**
   * get url - The URL we're trying to fetch
   *
   * @return {String} A string containing a URl
   */
  get url () { return this._url }

  /**
   * get headers - Headers returned from the response
   *
   * @return {Optional<Object>} An object containing the key/value pairs of the header
   */
  get headers () { return this._headers }
  set headers (val) {
    this._headers = val
    this._contentLength = parseInt(this.headers['content-length'], 10)
  }

  /**
   * get progress - Computed property that shows the progress of a fetch
   *
   * @return {Float} Float describing the percentage complete
   */
  get progress () {
    if (this.contentLength) {
      return +(100.0 * this.contentRead / this.contentLength).toFixed(2)
    }
    return 0
  }

  /**
   * fetch - Execute the fetch
   *
   * @param  {Function} onProgress A function that gets called with progress updates
   * @return {Promise}             A promise for the fetch
   */
  fetch (onProgress) {
    const execute = () => {
      const onResponse = (response) => { this.headers = response.headers }
      const onRedirect = (location) => {
        this.newLocation = location
        this.redirects.push(location)
      }
      const onProgressWrapper = (progress) => {
        this.contentLength = progress.size
        this.contentRead = progress.downloaded
        if (onProgress) { onProgress(Object.assign(progress, {progress: this.progress})) }
      }

      var params = { url: this.url,
        timeout: this.timeout,
        onProgress: onProgressWrapper,
        onResponse: onResponse,
        encoding: this.encoding,
        followRedirects: this.followRedirects}

      if (this.followRedirects) {
        params = Object.assign(params, {onRedirect: onRedirect})
        if (this.newLocation) { params.url = this.newLocation }
      }

      this.fetchCount += 1

      if (params.url.substring(0, 5) === 'https') {
        return simpleGet(params, https)
      } else {
        return simpleGet(params, http)
      }

    }

    return execute().catch(err => retry(execute, this.maxRetries, err))
  }
}

/**
 * Simple function to catch and retry a function until we run out of attempts
 */
const retry = (fn, retries, err) => {
  if (retries >= 1) {
    if (shouldAttemptRetry(err)) {
      return fn().catch(err => retry(fn, (retries - 1), err))
    }
  }
  return Promise.reject(err)
}

/**
 * Simple checks to prevent us from needlessly retrying calls
 */
const shouldAttemptRetry = (err) => {
  if (typeof err === 'number') {
    return shouldAttemptRetryByStatusCode(err)
  }

  if (typeof err === 'object' && err.code) {
    return shouldAttemptRetryByNetworkError(err.code)
  }

  return true
}

/**
 * Rules for retrying based on HTTP status code
 */
const shouldAttemptRetryByStatusCode = (statusCode) => {
  switch (statusCode) {
    case 400:
    case 401:
    case 402:
    case 403:
    case 404:
    case 405:
    case 406:
    case 407:
    case 409:
    case 410:
    case 451:
      return false
    default:
      return true
  }
}

/**
 * Rules for retrying based on network errors
 */
const shouldAttemptRetryByNetworkError = (errCode) => {
  switch (errCode) {
    case 'ECONNRESET':
    case 'ECONNREFUSED':
    case 'EPIPE':
    case 'ETIMEDOUT':
      return true
    case 'ENOTFOUND':
      return false
    default:
      return false
  }
}

/**
 * Simple get request for fetching something
 */
const simpleGet = (params, proto) => {
  const url = params.url
  const timeout = params.timeout || 10000
  const onProgress = params.onProgress || (() => {})
  const onResponse = params.onResponse || (() => {})
  const onRedirect = params.onRedirect || (() => {})
  const encoding = params.encoding || 'utf8'
  const followRedirects = params.followRedirects || true

  return new Promise((resolve, reject) => {

    const setupTimer = (timer, timeout) => {
      clearTimeout(timer)
      return setTimeout(() => {
        reject('fetch timed out')
      }, timeout)
    }

    var timer = setupTimer(undefined, timeout)

    const request = proto.get(url, (response) => {
      // Call the onResponse callback
      onResponse(response)

      if (response.statusCode != 200) {
        // Check if we got a redirect
        if (response.statusCode == 301 && followRedirects) {
          if (response.headers['location']) {
            onRedirect(checkLocation(url, response.headers['location']))
          }
        }

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

          if (encoding == 'binary') {
            // Convert string to a Uint8Array
            resolve(Uint8Array.from(data, (x) => x.charCodeAt(0)))
          } else {
            resolve(data)
          }

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
 * Used to resolve URLs returned from 301's
 */
const checkLocation = (originalURL, newLocation) => {
  const original = url.parse(originalURL)
  var location = url.parse(newLocation)

  if (!location.hostname) {
    return url.resolve(original, location)
  }

  return newLocation
}
