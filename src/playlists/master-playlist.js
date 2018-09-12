import Playlist from './base-playlist'
import { configureMasterPlaylist } from '../parsers/playlist/playlist-parser'

/**
 * A Master Playlist provides a set of Variant Streams, each of which
   describes a different version of the same content.

   A Variant Stream includes a Media Playlist that specifies media
   encoded at a particular bit rate, in a particular format, and at a
   particular resolution for media containing video.

   A Variant Stream can also specify a set of Renditions.  Renditions
   are alternate versions of the content, such as audio produced in
   different languages or video recorded from different camera angles.

   Clients should switch between different Variant Streams to adapt to
   network conditions.  Clients should choose Renditions based on user
   preferences.

 */
class MasterPlaylist extends Playlist {

  constructor (playlistStruct, body) {
    super(playlistStruct, body)
    this.variants = []
    this.objType  = 'MasterPlaylist'
    configureMasterPlaylist(this, playlistStruct)
  }

  set basePath(val) {
    this._basePath = val

    if (this.variants) {
      this.variants.forEach(v => v.basePath = val)
    }

    if (this.renditions) {
      this.renditions.forEach(v => v.basePath = val)      
    }
  }

  get basePath() { return this._basePath }

  /**
   * get regularVariants - Get variant streams that are regular
   *
   * @return {Array<VariantStream>}  An array of variant streams that are 'regular' non-iFrame
   */
  get regularVariants () {
    return this.variants.filter(vs => vs.isIFrame == false)
  }

  /**
   * get iFrameVaraints - Get variant streams that are iFrame only
   *
   * @return {Array<VariantStream>} An array of variant streams that are iFrame only
   */
  get iFrameVaraints () {
    return this.variants.filter(vs => vs.isIFrame == true)
  }


  /**
   * get variantsAllHaveCodecsInfo - Master playlists contain a list of variants that sometimes have codec information and sometimes does not.
   * This is used to determine if they all have codecs or not
   *
   * @return {type}  description
   */
  get variantsAllHaveCodecsInfo() {
    for (let variant of this.regularVariants) {
      if (variant.codecs === undefined || variant.codecs === null) {
        return false
      }
    }
    return true
  }

  /**
   * get lowestBandwidthVariant - Returns variants with the lowest bandwidth rate
   *
   * @return {Variant} Variant with the lowest bandwidth
   */
  get lowestBandwidthVariant() {
    return lowestBandWidthVariant(this.regularVariants)
  }

  /**
   * get audioOnlyVariants - Return variants that are labeled as audio only
   *
   * @return {Array<Variant>} An array of variants
   */
  get audioOnlyVariants() {
    return this.regularVariants
    .filter(v => v.codecs !== undefined)
    .filter(v => (v.codecs.split(',').length === 1))
  }

  /**
   * get completeVariants - Return variants that might have both audio & video.
   * Variants that aren't labeled
   *
   * @return {Array<Variant>}
   */
  get completeVariants() {
    if (this.variantsAllHaveCodecsInfo) {
      /// Kind of dumb, but maybe kind of not?
      /// Filter most tracks based on the highest amount of codecs listed
      const codecsCnt = unique(this.regularVariants.map(v => v.codecs.split(',').length))
      const trackMax  = codecsCnt.reduce((a, b) => Math.max(a,b))
      return this.regularVariants.filter(v => v.codecs.split(',').length === trackMax)
    } else {
      const results = this.regularVariants.filter(v => v.codecs === undefined)
      return results
    }
  }

}

const lowestBandWidthVariant = (variants) => {
  return variants.sort((a, b) => a.bandwidth - b.bandwidth)[0]
}

const unique = (arr) => {
  return arr.filter((val, idx, self) => {
    return self.indexOf(val) === idx
  })
}


export default MasterPlaylist
