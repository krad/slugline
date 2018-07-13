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

const MEDIA_PLAYLIST_TAGS = [
  "#EXT-X-TARGETDURATION",
  "#EXT-X-MEDIA-SEQUENCE",
  "#EXT-X-DISCONTINUITY-SEQUENCE",
  "#EXT-X-ENDLIST",
  "#EXT-X-PLAYLIST-TYPE",
  "#EXT-X-I-FRAMES-ONLY"
]

const MASTER_PLAYLIST_TAGS = [
  "EXT-X-MEDIA",
  "EXT-X-STREAM-INF",
  "EXT-X-I-FRAME-STREAM-INF",
  "EXT-X-SESSION-DATA",
  "EXT-X-SESSION-KEY"
]

const MASTER_AND_MEDIA_TAGS = [
  "EXT-X-INDEPENDENT-SEGMENTS",
  "EXT-X-START",
]

class Parser {
  static parse(body) {
    if (body.slice(0, 7) !== '#EXTM3U') { throw 'not valid playlist' }
    const playlistStruct = parseTagsAndAttributes(body)
    if (isMediaPlaylist(playlistStruct)) {
      return new MediaPlaylist(playlistStruct)
    } else {
      return new MasterPlaylist(playlistStruct)
    }
  }
}

const isMediaPlaylist = (playlistStruct) => {
  return findOne(playlistStruct, MEDIA_PLAYLIST_TAGS)
}

const componentsFromString = (body) => {
  return body.trim().split('\n')
}

const parseTagsAndAttributes = (body) => {
  return componentsFromString(body).map(line => {

    const comps = line.split(":")
    if (comps.length > 1) {
      return {[comps[0]]: Attribute.parse(comps[1])}
    } else {
      return line
    }
  })
}

const findOne = (haystack, arr) => {
  return arr.some(x => haystack.indexOf(x) >= 0)
}

export { Parser, parseTagsAndAttributes }
