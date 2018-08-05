import * as atoms from './atoms'
import * as bytes from './byte-helpers'
import ElementaryStream from '../parsers/container/ts/elementary-stream'

class Transmuxer {
  constructor(transportStream) {
    this.ts      = transportStream
    const pmt    = this.ts.packets.filter(p => p.constructor.name == 'PMT')[0]
    this.tracks  = pmt.tracks.map(t => { return ElementaryStream.parse(this.ts, t.streamType) })
    this.config  = this.tracks.map((t,idx) => {return {type: t.streamType, codec: t.codecBytes, id: idx+1}} )

    this.config.forEach(config => {
      if (config.type === 27) {
        const buffer = new Uint8Array(config.codec[0])
        config.sps = bytes.parseSPS(buffer)
      }
    })

  }

  buildInitializationSegment() {
    let result = []
    result.push(atoms.ftyp())
    result.push(atoms.moov(this.config))
    result = result.map(a => atoms.build(a))
    return bytes.concatenate(Uint8Array, ...result)
  }
}

export default Transmuxer
