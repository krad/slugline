import * as atoms from './atoms'
import * as bytes from './byte-helpers'
import ElementaryStream from '../parsers/container/ts/elementary-stream'

class Transmuxer {
  constructor(transportStream) {
    this.ts = transportStream

    const pmt          = this.ts.packets.filter(p => p.constructor.name == 'PMT')[0]
    const trackPackets = pmt.tracks.map(t => {
      return ElementaryStream.parse(this.ts, t.streamType)
    })

    // console.log(trackPackets.length);
    // console.log(trackPackets[0].codec);
    // console.log(trackPackets[1].codec);
    // console.log(this.ts);
  }

  buildInitializationSegment() {
    let config = {}
    let result = []
    result.push(atoms.ftyp())
    result.push(atoms.moov(config))
    result = result.map(a => atoms.build(a))
    return bytes.concatenate(Uint8Array, ...result)
  }
}

export default Transmuxer
