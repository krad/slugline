class Fetcher {
  constructor(config) {
    this._timeout = config.timeout || 2000
  }

  fetch() {
    this._promise = new Promise((resolve, reject) => {
      var timer = setTimeout(() => {
        reject(new Error('fetch timed out'))
      }, this._timeout)
    })
    return this._promise
  }

  get progress() {
    return 0
  }
}

export { Fetcher }
