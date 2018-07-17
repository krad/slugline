const http = require('http')
import { Playlist } from './playlist'

class Fetcher {
  constructor(config) {
    this._timeout = config.timeout || 2000
    this._url     = config.url
  }

  fetch() {
    this._promise = new Promise((resolve, reject) => {

      var timer = setTimeout(() => {
        reject(new Error('fetch timed out'))
      }, this._timeout)

      var request = http.get(this._url, (response) => {
        var data = ''
        switch (response.statusCode) {
          case 404:
            reject(new Error('404 Not Found'))
            break
          case 200:
            response.on('data', (chunk) => { data += chunk })
            response.on('end', () => { resolve(Playlist.parse(data)) })
            break
        }
      })

    })
    return this._promise
  }

  get progress() {
    return 0
  }
}


export { Fetcher }
