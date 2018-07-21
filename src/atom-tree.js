import Atom from './atom'

/**
 * AtomTree - A structure describing the atoms within an mpeg file
 */
class AtomTree {

  constructor() {
    this.root = []
  }

  /**
   * @static parse - Method to parse mpeg data
   *
   * @param  {Uint8Array} arrayBuffer An Uint8array that represents the contents of an mpeg file
   * @return {AtomTree}               An AtomTree
   */
  static parse(arrayBuffer) {
    let cursor = 0
    let tree = new AtomTree()
    while (cursor <= arraybuffer.length) {

      let atomIdent = arraybuffer.slice(cursor, cursor+4)
      let atomName  = String.fromCharCode.apply(null, atomIdent)

      if (Object.keys(ATOMS).includes(atomName)) {
        var sizeBytes = arraybuffer.buffer.slice(cursor-4, cursor)
        var view      = new DataView(sizeBytes)
        var atomSize  = view.getUint32(0)

        var payload = arraybuffer.slice(cursor+4, (cursor+atomSize)-4)
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

  get length() {
    return this.root.length
  }

  /**
   * insert -  Insert an atom into the atom tree at it's appropriate location
   *
   * @param  {Atom} atom An Atom object
   */
  insert(atom) {
    let root = this.root
    let children =
    root.flatMap(function(e) { return explode(e) })
    .filter(function(e) { if (isChild(atom, e)) { return e } })

    if (children.length == 0) {
      root.push(atom)
    } else {
      let lastChild = children[children.length-1]
      lastChild.insert(atom)
    }
  }


  /**
   * findAtoms - Find atoms by name
   *
   * @param  {String} atomName The name of all the atoms you want to find
   * @return {Array<Atom>}     An array of atoms with the name searched for
   */
  findAtoms(atomName) {
    return this.root.flatMap(function(e) { return explode(e) })
    .filter(function(e) { if (e.name == atomName) { return e } })
  }

}

export default AtomTree
