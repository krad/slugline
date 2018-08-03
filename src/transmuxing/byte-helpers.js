/**
 * concatenate - Concat an array of byte buffers
 *
 * @param  {type} resultConstructor Type you want to produce (eg: Uint8Array)
 * @param  {type} ...arrays         A spread of array byte buffers
 */
export const concatenate = (resultConstructor, ...arrays) => {
    let totalLength = 0;
    for (const arr of arrays) {
        totalLength += arr.length;
    }
    const result = new resultConstructor(totalLength);
    let offset = 0;
    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
}



/**
 * Convert a number to a 32bit number in a Uint8Array
 */
export const u32 = (lng) => {
  let arr = new Uint8Array(4)
  for (let i = 0; i < arr.length; i++) {
    let byte = lng & 0xff
    arr[i] = byte
    lng = (lng - byte) / 256
  }
  return arr.reverse()
}

/**
 * Convert a string to a Uint8Array
 */
export const strToUint8 = (str) => {
  const buf = new Uint8Array(str.length)
  for (var i = 0; i < str.length; i++) {
    buf[i] = str.charCodeAt(i) & 255
  }
  return buf
}
