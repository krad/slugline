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
    configureMasterPlaylist(this, playlistStruct)
  }

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
}

export default MasterPlaylist
