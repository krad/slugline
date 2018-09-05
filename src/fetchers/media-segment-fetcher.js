import Fetcher from './fetcher'

/**
 * MediaSegmentFetcher can be used to fetch a media segment
 */
class MediaSegmentFetcher extends Fetcher {
  constructor (config) {
    super(config)
    this.encoding = 'binary'
  }
}

export default MediaSegmentFetcher
