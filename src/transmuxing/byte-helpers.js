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

const unsignedBytes = (input, dstConstructor) => {
  let arr = new Uint8Array(dstConstructor.BYTES_PER_ELEMENT)
  for (let i = 0; i < arr.length; i++) {
    let byte = input & 0xff
    arr[i] = byte
    input = (input - byte) / 256
  }
  return arr.reverse()
}


/**
 * Take a 64bit number and return an unsigned 8 bit array
 */
export const u64 = (input) => {
  return unsignedBytes(input, Uint64Array)
}

/**
 * Take a 32bit number and return an unsigned 8 bit array
 */
export const u32 = (input) => {
  return unsignedBytes(input, Uint32Array)
}

/**
 * Take a 16bit number and return an unsigned 8 bit array
 */
export const u16 = (input) => {
  return unsignedBytes(input, Uint16Array)
}

export const s16 = (input) => {
  return unsignedBytes((input >> 0), Int16Array)
}

export const bufferToStr = (input) => {
  return String.fromCharCode.apply(null, input);
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
