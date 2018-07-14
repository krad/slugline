class Attribute {

  static parse(input) {
    const components = input.split(',').map(i => i.split('='))
    if (components[0].length == 1) {
      return stringOrNumber(clean(input))
    } else {
      const x = components.reduce(arrayToObject, {})
      return x
    }
  }

  static parseInfo(input) {
    var result = {}
    const comps = input.split(',')
    result['duration'] = stringOrNumber(comps[0])
    if (comps[1]) { result['title'] = comps[1] }
    return result
  }

}

const arrayToObject = (acc, cur) => {
  acc[cur[0]] = clean(cur[1])
  return acc
}

const stringOrNumber = (input) => {
  if (isNaN(input)) {
    return input
  }
  return +input
}

const clean = (input) => {
  return input.replace(/[",]/g, "")
}

export { Attribute }
