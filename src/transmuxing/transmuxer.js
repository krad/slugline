import * as atoms from './atoms'
import * as bytes from './byte-helpers'
import ElementaryStream from '../parsers/container/ts/elementary-stream'

class Transmuxer {
  constructor(transportStream) {
    this.ts = transportStream

    const pmt    = this.ts.packets.filter(p => p.constructor.name == 'PMT')[0]
    this.tracks  = pmt.tracks.map(t => { return ElementaryStream.parse(this.ts, t.streamType) })
    this.config  = pmt.tracks

    // console.log(trackPackets);
    // console.log(pmt.tracks);
    // console.log(trackPackets[0].codecBytes);
    // console.log(trackPackets[0].codec);
    // console.log(trackPackets[1].codec);
  }

  buildInitializationSegment() {

    console.log(this.tracks.map(t => return {{type: t.streamType, codec: t.codecBytes}} ))
    // console.log(this.tracks[0].codecBytes);

    // console.log(this.config);
    // console.log(this.tracks[0].streamType);
    // console.log(this.tracks[1].streamType);


    let config = {}
    let result = []
    result.push(atoms.ftyp())
    result.push(atoms.moov(config))
    result = result.map(a => atoms.build(a))
    return bytes.concatenate(Uint8Array, ...result)
  }
}

export default Transmuxer
