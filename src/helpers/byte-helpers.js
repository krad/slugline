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
  return unsignedBytes(input, {BYTES_PER_ELEMENT: 64})
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

export const expGolombEnc = (input, signed) => {
  let value = input
  if (input < 0) { value = -(input * 2) }

  if (signed) {
    if (input < 0) { value = -(input * 2) }
    else { value = (input * 2) - 1 }
  }

  const bin = (value + 1).toString(2)
  return '0'.repeat(bin.length - 1) + bin
}

export const expGolobDec = (input) => {
  if (input === '1') { return 0 }
  let value = parseInt(input, 2) - 1
  return value
}

export const parseSPS = (input) => {
  let reader = new BitReader(input)

  reader.readBits(8)
  const profileIDC           = reader.readBits(8)
  const constraint_set0_flag = reader.readBit()
  const constraint_set1_flag = reader.readBit()
  const constraint_set2_flag = reader.readBit()
  const constraint_set3_flag = reader.readBit()
  const constraint_set4_flag = reader.readBit()

  /// forbidden zero bits
  reader.readBits(3)

  const levelIDC         = reader.readBits(8)
  const seq_param_set_id = reader.readExpGolomb()

  const extras = [100, 122, 244, 44, 83, 86, 118, 128]
  if (extras.includes(profileIDC)) {
    // FIXME: Find a file that has one of these profiles
  }

  const log2_max_frame_num_minus4 = reader.readExpGolomb()
  const pic_order_cnt_type        = reader.readExpGolomb()
  if (pic_order_cnt_type === 0) {
    const log2_max_pic_order_cnt_lsb_minus4 = reader.readExpGolomb()
  }

  if (pic_order_cnt_type === 1) {
    // FIXME: Find a file where this matters and I can test output
  }

  const max_num_ref_frames = reader.readExpGolomb()
  const gaps_in_frame_num_value_allowed_flag = reader.readBit()

  const pic_width_in_mbs_minus1 = reader.readExpGolomb()
  const pic_height_in_map_units_minus1 = reader.readExpGolomb()
  const frame_mbs_only_flag = reader.readBit()

  if (frame_mbs_only_flag === 0) {
    const mb_adaptive_frame_field_flag = reader.readBit()
  }

  const direct_8x8_inference_flag = reader.readBit()

  const frame_cropping_flag     = reader.readBit()
  let frame_crop_top_offset     = 0
  let frame_crop_bottom_offset  = 0
  let frame_crop_left_offset    = 0
  let frame_crop_right_offset   = 0

  if (frame_cropping_flag) {
    frame_crop_left_offset    = reader.readExpGolomb()
    frame_crop_right_offset   = reader.readExpGolomb()
    frame_crop_top_offset     = reader.readExpGolomb()
    frame_crop_bottom_offset  = reader.readExpGolomb()
  }

  const width   = Math.ceil((((pic_width_in_mbs_minus1 + 1) * 16) - frame_crop_left_offset * 2 - frame_crop_right_offset * 2))
  const height  = ((2 - frame_mbs_only_flag)* (pic_height_in_map_units_minus1 +1) * 16) - (frame_crop_top_offset * 2) - (frame_crop_bottom_offset * 2)

  return {
    profileIDC: profileIDC,
    constraint_set0_flag: constraint_set0_flag,
    constraint_set1_flag: constraint_set1_flag,
    constraint_set2_flag: constraint_set2_flag,
    constraint_set3_flag: constraint_set3_flag,
    constraint_set4_flag: constraint_set4_flag,
    levelIDC: levelIDC,
    log2_max_frame_num_minus4: log2_max_frame_num_minus4,
    pic_order_cnt_type: pic_order_cnt_type,
    max_num_ref_frames: max_num_ref_frames,
    gaps_in_frame_num_value_allowed_flag: gaps_in_frame_num_value_allowed_flag,
    pic_width_in_mbs_minus1: pic_width_in_mbs_minus1,
    pic_height_in_map_units_minus1: pic_height_in_map_units_minus1,
    frame_mbs_only_flag: frame_mbs_only_flag,
    direct_8x8_inference_flag: direct_8x8_inference_flag,
    width: width,
    height: height
  }
}

export class BitReader {

  constructor(input) {
    this.data       = input
    this.length     = input.byteLength
    this.currentBit = 0
  }

  readBit() {
    let index   = Math.floor(this.currentBit / 8)
    let offset  = this.currentBit % 8 + 1
    this.currentBit += 1
    return (this.data[index] >> (8 - offset)) & 0x01
  }

  readBits(n) {
    let result = 0
    for (var i = 0; i < n; i++) {
      result |= (this.readBit() << (n - i - 1))
    }
    return result
  }

  readExpGolomb() {
    let result = 0
    let i = 0

    while((this.readBit() === 0) && (i < 32)) {
      i += 1
    }

    result = this.readBits(i)
    result += (1 << i) - 1
    return result
  }
}
