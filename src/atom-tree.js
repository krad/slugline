import Atom from './atom'

/**
 * AtomTree - A structure describing the atoms within an mpeg file
 */
class AtomTree {

  constructor() {
    this.root = []
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

/**
 * explode - Used to recursively unwrap an Atom's children into a flat array
 *
 * @param  {Atom} atom An Atom object with children
 * @return {Array<Atom>} A 1 dimensional array including an atom and all of it's children (and there children and so forth)
 */
const explode = (atom) => {
  if (atom.children) {
    var exploded = atom.children.flatMap(function(x){ return explode(x) })
    return [atom].concat(exploded)
  } else {
    return [atom]
  }
}

/**
 * isChild - Simple check if an atom is a descendant (direct and otherwise) of a parent atom
 *
 * @param  {Atom} subject The Atom that may be a child
 * @param  {Atom} suspect The Atom that may be the parent
 * @return {Boolean} A bool.  true if the subject falls within the range of the parent
 */
function isChild(subject, suspect) {
  if (subject.location < (suspect.location + suspect.size)) {
    return true
  }
  return false
}


export default AtomTree
