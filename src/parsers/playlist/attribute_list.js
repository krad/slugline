class Attribute {
  static parse (input) {
    switch (input[0]) {
      case '#EXTINF':
        return Attribute.parseInfo(input[1])
      default:
        return Attribute.parseList(input[1])
    }
  }

  static parseList (input) {
    if (typeof input === 'string') {
      const components = splitComponents(input)
      if (Object.keys(components).length == 0) {
        return stringOrNumber(clean(input))
      }
      return components
    } else {
      return input
    }
  }

  static parseInfo (input) {
    var result = {}
    const comps = input.split(',')
    result['duration'] = stringOrNumber(comps[0])
    if (comps[1]) { result['title'] = comps[1] }
    return result
  }
}

const splitComponents = (input) => {
  return input
    .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
    .map(i => i.split('='))
    .reduce(arrayToObject, {})
}

const arrayToObject = (acc, cur) => {
  if (cur[1]) {
    acc[cur[0]] = stringOrNumber(clean(cur[1]))
  }
  return acc
}

const stringOrNumber = (input) => {
  if (isNaN(input)) {
    return input
  }
  return +input
}

const clean = (input) => {
  return input.replace(/["]/g, '')
}

export { Attribute, splitComponents }
