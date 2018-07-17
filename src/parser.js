import { Attribute } from './attribute_list'
import { MediaPlaylist, MasterPlaylist, VariantStream, Rendition } from './playlist'
import { MediaSegment, MediaInitializationSegment } from './media_segment'

const BASIC_TAGS = [
  "#EXTM3U",
  "#EXT-X-VERSION"
]

const MEDIA_SEGMENT_TAGS = [
  "#EXTINF",
  "#EXT-X-BYTERANGE",
  "#EXT-X-DISCONTINUITY",
  "#EXT-X-KEY",
  "#EXT-X-MAP",
  "#EXT-X-PROGRAM-DATE-TIME",
  "#EXT-X-DATERANGE"]

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
  "#EXT-X-INDEPENDENT-SEGMENTS",
  "#EXT-X-START",
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
    if (comps.length > 1 && comps[0] !== 'http') {
      return {[comps[0]]: Attribute.parse(comps)}
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

/// Used to configure a media playlist
const configureMediaPlaylist = (playlist, struct) => {
  var currentSegment = undefined
  struct.forEach(tag => {
    if (typeof tag === 'string') {

      if (tag === '#EXT-X-ENDLIST') {
        playlist._ended = true
      } else {
        if (currentSegment) {
          currentSegment.uri = tag
          playlist.segments.push(currentSegment)
          currentSegment = undefined
        }
      }
    }

    if (typeof tag == 'object') {
      if (tag['#EXT-X-MAP']) {
        if (tag['#EXT-X-MAP']['URI']) {
          playlist.segments.push(new MediaInitializationSegment(tag['#EXT-X-MAP']['URI']))
        }
      }

      if (tag['#EXTINF']) {
        currentSegment = new MediaSegment(tag['#EXTINF'])
      }

      if (tag['#EXT-X-TARGETDURATION']) {
        playlist.targetDuration = tag['#EXT-X-TARGETDURATION']
      }

      if (tag['#EXT-X-VERSION']) {
        playlist.version = tag['#EXT-X-VERSION']
      }

      if (tag['#EXT-X-PLAYLIST-TYPE']) {
        playlist._type = tag['#EXT-X-PLAYLIST-TYPE']
      }

      if (tag['#EXT-X-MEDIA_SEQUENCE']) {
        playlist.mediaSequenceNumber = tag['#EXT-X-MEDIA_SEQUENCE']
      }
    }
  })
}

/// Used to configure a master playlist
const configureMasterPlaylist = (playlist, struct) => {
  var currentVariant = undefined
  struct.forEach(tag => {
    if (typeof tag === 'string') {
      if (currentVariant) {
        currentVariant.uri = tag
        playlist.variants.push(currentVariant)
        currentVariant = undefined
      }
    }

    if (typeof tag == 'object') {
      if (tag['#EXT-X-STREAM-INF']) {
        currentVariant = new VariantStream(tag['#EXT-X-STREAM-INF'])
      }

      if (tag['#EXT-X-I-FRAME-STREAM-INF']) {
        var variant       = new VariantStream(tag['#EXT-X-I-FRAME-STREAM-INF'])
        variant.isIFrame  = true
        playlist.variants.push(variant)
      }

      if (tag['#EXT-X-MEDIA']) {
        if (!playlist.renditions) { playlist.renditions = [] }
        playlist.renditions.push(new Rendition(tag['#EXT-X-MEDIA']))
      }
    }
  })
}

/// Used to configure a variant stream
const configureVariantStream = (variant, streamInfo) => {
  if (streamInfo['AVERAGE-BANDWIDTH']) {
    variant.avgBandwidth = streamInfo['AVERAGE-BANDWIDTH']
  }

  if (streamInfo['CODECS']) {
    variant.codecs = streamInfo['CODECS']
  }

  if (streamInfo['RESOLUTION']) {
    variant.resolution = streamInfo['RESOLUTION']
  }

  if (streamInfo['FRAME-RATE']) {
    variant.frameRate = streamInfo['FRAME-RATE']
  }

  if (streamInfo['CLOSED-CAPTIONS']) {
    variant.closedCaptionsIdent = streamInfo['CLOSED-CAPTIONS']
  }

  if (streamInfo['URI']) {
    variant.uri = streamInfo['URI']
  }

  if (streamInfo['AUDIO']) {
    variant.audioIdent = streamInfo['AUDIO']
  }

  if (streamInfo['SUBTITLES']) {
    variant.subtitlesIdent = streamInfo['SUBTITLES']
  }
}

/// Used to configure a rendition
const configureRendition = (rendition, renditionInfo) => {
  rendition.default    = optionalYesOrNo(renditionInfo['DEFAULT'])
  rendition.autoselect = optionalYesOrNo(renditionInfo['AUTOSELECT'])
  rendition.forced     = optionalYesOrNo(renditionInfo['FORCED'])
  rendition.type       = renditionInfo['TYPE']
  rendition.groupId    = renditionInfo['GROUP-ID']
  rendition.name       = renditionInfo['NAME']

  if (rendition.type != 'CLOSED-CAPTIONS') {
    if (renditionInfo['URI']) {
      rendition.uri  = renditionInfo['URI']
    }
  } else {
    rendition.inStreamId = renditionInfo['INSTREAM-ID']
  }

  if (rendition.type == 'AUDIO') {
    rendition.channels = renditionInfo['CHANNELS']
  }

  if (renditionInfo['LANGUAGE']) {
    rendition.language = renditionInfo['LANGUAGE']
  }

  if (renditionInfo['ASSOC-LANGUAGE']) {
    rendition.assocLanguage = renditionInfo['ASSOC-LANGUAGE']
  }
}

const optionalYesOrNo = (value) => {
  if (value && value.toLowerCase() == 'yes') {
    return true
  }
  return false
}


export { Parser, parseTagsAndAttributes, configureMediaPlaylist, configureMasterPlaylist, configureVariantStream, configureRendition }
