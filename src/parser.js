import { Attribute } from './attribute_list'
import { MediaPlaylist, MasterPlaylist } from './playlist'

const BASIC_TAGS = ["EXTM3U", "EXT-X-VERSION"]

const MEDIA_SEGMENT_TAGS = [
  "EXTINF",
  "EXT-X-BYTERANGE",
  "EXT-X-DISCONTINUITY",
  "EXT-X-KEY",
  "EXT-X-MAP",
  "EXT-X-PROGRAM-DATE-TIME",
  "EXT-X-DATERANGE"]

/**
 * Tags that ONLY appear in Media Playlists
 */
const MEDIA_PLAYLIST_TAGS = [
  "#EXT-X-TARGETDURATION",
  "#EXT-X-MEDIA-SEQUENCE",
  "#EXT-X-MEDIA_SEQUENCE",
  "#EXT-X-DISCONTINUITY-SEQUENCE",
  "#EXT-X-ENDLIST",
  "#EXT-X-PLAYLIST-TYPE",
  "#EXT-X-I-FRAMES-ONLY"
]

/**
 * Tags that ONLY appear in Master Playlists
 */
const MASTER_PLAYLIST_TAGS = [
  "#EXT-X-MEDIA",
  "#EXT-X-STREAM-INF",
  "#EXT-X-I-FRAME-STREAM-INF",
  "#EXT-X-SESSION-DATA",
  "#EXT-X-SESSION-KEY"
]

/**
 * Tags that can appear in BOTH Media and Master Playlists
 */
const MASTER_AND_MEDIA_TAGS = [
  "EXT-X-INDEPENDENT-SEGMENTS",
  "EXT-X-START",
]

const ERRORS = {
  INVALID: 'not valid playlist',
  MIXED_TAGS: 'playlist had media & master tags'
}

class Parser {
  static parse(body) {
    if (body.slice(0, 7) !== '#EXTM3U') { throwError(ERRORS.INVALID) }
    const playlistStruct = parseTagsAndAttributes(body)

    const isMedia   = isMediaPlaylist(playlistStruct)
    const isMaster  = isMasterPlaylist(playlistStruct)

    // If we have tags for both Media and Master type playlists, something is wrong
    if (isMedia && isMaster) { throwError(ERRORS.MIXED_TAGS) }
    if (isMedia) { return new MediaPlaylist(playlistStruct) } // return a MediaPlaylist
    if (isMaster) { return new MasterPlaylist(playlistStruct) } // return a MasterPlaylist

    throwError(ERRORS.INVALID)
  }
}

const throwError = (err) => {
  throw err
}


/**
 * Used to determine if a parsed playlist struct is a media playlist
 */
const isMediaPlaylist = (playlistStruct) => {
  return findOne(tagsFrom(playlistStruct), MEDIA_PLAYLIST_TAGS)
}


/**
 * Used to determine is a parsed playlist struct is a master playlist
 */
const isMasterPlaylist = (playlistStruct) => {
  return findOne(tagsFrom(playlistStruct), MASTER_PLAYLIST_TAGS)
}

/**
 * Used to extract just the tags from a parsed playlist struct
 */
const tagsFrom = (playlistStruct) => {
  return flattenPlaylist(playlistStruct).filter(tag => tag.slice(0, 1) == '#')
}


/**
 * Used to extract tags / playlist entries WITHOUT attribuets from a parsed playlist struct
 */
const flattenPlaylist = (struct) => {
  return struct.map(line => {
    switch (line.constructor.name) {
      case 'String':
        return line
      case 'Object':
        return Object.keys(line)[0]
    }
  })
}

/**
 * Breaks a string by newline characters.  Returns an array with an entry for each line
 */
const componentsFromString = (body) => {
  return body.trim().split('\n')
}

/**
 * Build an array with entries of parsed tags.
 */
const parseTagsAndAttributes = (body) => {
  return componentsFromString(body).map(line => {

    const comps = line.split(":")
    if (comps.length > 1) {
      if (comps[0] == '#EXTINF') {
        return {[comps[0]]: Attribute.parseInfo(comps[1])}
      } else {
        return {[comps[0]]: Attribute.parse(comps[1])}
      }
    } else {
      return line
    }
  })
}


/**
 * Used to find members of an array present in another array
 */
const findOne = (haystack, arr) => {
  return arr.some(x => haystack.indexOf(x) >= 0)
}

export { Parser, parseTagsAndAttributes }
