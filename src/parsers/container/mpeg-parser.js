import AtomParser from './fmp4/atom-parser'
import Atom from './fmp4/atom'
import AtomTree from './fmp4/atom-tree'

const MPEGParser = {

  /**
   * parse - Function to parse mpeg data
   *
   * @param  {Uint8Array} arrayBuffer An Uint8array that represents the contents of an mpeg file
   * @return {AtomTree}               An AtomTree
   */
  parse: (arrayBuffer) => {
    let cursor = 0
    let tree = new AtomTree()
    while (cursor <= arrayBuffer.length) {

      let atomIdent = arrayBuffer.slice(cursor, cursor+4)
      let atomName  = String.fromCharCode.apply(null, atomIdent)

      if (Object.keys(AtomParser).includes(atomName)) {
        var sizeBytes = arrayBuffer.buffer.slice(cursor-4, cursor)
        var view      = new DataView(sizeBytes)
        var atomSize  = view.getUint32(0)

        var payload = arrayBuffer.slice(cursor+4, (cursor+atomSize)-4)
        var atom    = new Atom(atomName, cursor-4, atomSize, payload)
        tree.insert(atom)
        cursor += 4
        continue
      }
      cursor += 1
    }

    let parsedCodecs = parseCodecs(tree)
    if (parsedCodecs) {
      tree.codecs = parsedCodecs
      tree.codecsString = createCodecsString(tree.codecs)
    }
    return tree
  }
}

/**
 * parseCodecs - Parses an AtomTree for codec information from any audio and/or video tracks
 * Video:
 *  We only support avc1 atoms at this time.  This respects proper profile, level parsing.
 *
 * Audio:
 *  I've only tested this with AAC streams.
 *  I pieced together ESDS generation from old specs and reverse engineering.
 *  Requirements in the HLS spec are fairly slim as of this writing so this *should* cover
 *  most use cases (AAC-LC, HE-AAC, *maybe* mp3?)
 *  I know for a fact this will work with morsel (github.com/krad/morsel)
 *
 * @param  {AtomTree} tree A tree representing the parsed contents of an mpeg file
 * @return {Array<String>} An array of codec strings (RFC6381)
 */
const parseCodecs = (tree) => {
  var result

  var videoScan = tree.findAtoms('avc1')
  if (videoScan && videoScan.length > 0) {
    var avc1 = videoScan[0]

    if (avc1.children && avc1.children.length > 0) {
      var profileScan = avc1.children.filter(function(e) { if (e.name == 'avcC') { return e } })
      if (profileScan && profileScan.length > 0) {
        var avcC = profileScan[0]
        if (avcC) {
          if (!result) { result = [] }

          var params = [avcC.profile,
                        avcC.profileCompatibility,
                        avcC.levelIndication].map(function(i) {
                          return ('0' + i.toString(16).toUpperCase()).slice(-2)
                        }).join('');

          var codec = "avc1." + params
          result.push(codec)
        }
      }
    }
  }

  var audioScan = tree.findAtoms('mp4a')
  if (audioScan && audioScan.length > 0) {
    var mp4a = audioScan[0]

    if (mp4a.children && mp4a.children.length > 0) {
      var audioConfScan = mp4a.children.filter(function(e) { if (e.name == 'esds') { return e } })
      if (audioConfScan && audioConfScan.length > 0) {
        var esds = audioConfScan[0]
        if (esds && esds.audioSpecificConfig) {
          if (!result)  { result = [] }
          var params = [esds.objectProfileIndication, esds.audioSpecificConfig.type].map(function(e){ return e.toString(16) }).join('.')
          var codec  = 'mp4a.' + params
          result.push(codec)
        }
      }
    }
  }

  return result
}

export const createCodecsString = (codecs) => {
  return 'video/mp4; codecs="' + codecs.join(',') + '"'
}

export default MPEGParser
