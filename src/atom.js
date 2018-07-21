import AtomParser from './atom-parser'

/**
 * Atom - An atom represents a section of data in a mpeg file
 */
class Atom {

  /**
   * constructor - Atom - An atom represents a section of data in a mpeg file
   *
   * @param  {String}     name     Name of the atom (4 characters)
   * @param  {Integer}    location Location of the beginning of the atom (where size starts)
   * @param  {Integer}    size     Size of the atom reported from the 32bit size integer
   * @param  {Uint8Array} payload  The actual atom data (starting after the atom name)
   * @return {Atom}                Atom struct with appropriate fields
   */
  constructor(name, location, size, payload) {
    this.name     = name
    this.location = location
    this.size     = size
    if (AtomParser[name]) { AtomParser[name](this, payload) }
  }

  /**
   * insert - Insert a child atom into a parent atom
   *
   * @param  {Atom} child An atom which is a descendant of a media atom
   */
  insert(child) {
    if (!this.children) { this.children = [] }
    this.children.push(child)
  }

}

export default Atom
