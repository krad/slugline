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
  return unsignedBytes(input, {BYTES_PER_ELEMENT: 8})
}

/**
 * Take a 32bit number and return an unsigned 8 bit array
 */
export const u32 = (input) => {
  return unsignedBytes(input, Uint32Array)
}

export const s32 = (input) => {
  return unsignedBytes((input >> 0), Int32Array)
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
  let sps = {}

  reader.readBits(8)
  sps.profileIDC           = reader.readBits(8)
  sps.constraint_set0_flag = reader.readBit()
  sps.constraint_set1_flag = reader.readBit()
  sps.constraint_set2_flag = reader.readBit()
  sps.constraint_set3_flag = reader.readBit()
  sps.constraint_set4_flag = reader.readBit()

  /// forbidden zero bits
  reader.readBits(3)

  sps.levelIDC         = reader.readBits(8)
  sps.seq_param_set_id = reader.readExpGolomb()

  const extras = [100, 122, 244, 44, 83, 86, 118, 128]
  if (extras.includes(sps.profileIDC)) {
    sps.chroma_format_idc = reader.readExpGolomb()
    if (sps.chroma_format_idc === 3) {
      sps.separate_color_plane_flag = reader.readBit()
    }

    sps.bit_depth_luma_minus8   = reader.readExpGolomb()
    sps.bit_depth_chroma_minus8 = reader.readExpGolomb()
    reader.readBit() // lossless_qpprime_y_zero_flag

    sps.seq_scaling_matrix_present_flag = reader.readBit()
    if (sps.seq_scaling_matrix_present_flag) {
      let scalingList = (sps.chroma_format_idc != 3) ? 8 : 12
      for (var i = 0; i < scalingList; i++) {
        if (reader.readBit()) {
        }
      }
    }
  }

  sps.log2_max_frame_num_minus4 = reader.readExpGolomb()
  sps.pic_order_cnt_type        = reader.readExpGolomb()
  if (sps.pic_order_cnt_type === 0) {
    sps.log2_max_pic_order_cnt_lsb_minus4 = reader.readExpGolomb()
  }

  if (sps.pic_order_cnt_type === 1) {
    sps.delta_pic_order_always_zero_flag  = reader.readBit()
    sps.offset_for_non_ref_pic            = reader.readExpGolomb()  /// signed exp golomb
    sps.offset_for_top_to_bottom_field    = reader.readExpGolomb() /// signed exp golomb
    sps.num_ref_frames_in_pic_order_cnt_cycle = reader.readExpGolomb()
    for (var i = 0; i < sps.num_ref_frames_in_pic_order_cnt_cycle; i++) {
      reader.readExpGolomb() // signed exp golomb
    }
  }

  sps.max_num_ref_frames = reader.readExpGolomb()
  sps.gaps_in_frame_num_value_allowed_flag = reader.readBit()

  sps.pic_width_in_mbs_minus1 = reader.readExpGolomb()
  sps.pic_height_in_map_units_minus1 = reader.readExpGolomb()
  sps.frame_mbs_only_flag = reader.readBit()

  if (sps.frame_mbs_only_flag === 0) {
    sps.mb_adaptive_frame_field_flag = reader.readBit()
  }

  sps.direct_8x8_inference_flag = reader.readBit()

  sps.frame_cropping_flag       = reader.readBit()
  sps.frame_crop_top_offset     = 0
  sps.frame_crop_bottom_offset  = 0
  sps.frame_crop_left_offset    = 0
  sps.frame_crop_right_offset   = 0

  if (sps.frame_cropping_flag) {
    sps.frame_crop_left_offset    = reader.readExpGolomb()
    sps.frame_crop_right_offset   = reader.readExpGolomb()
    sps.frame_crop_top_offset     = reader.readExpGolomb()
    sps.frame_crop_bottom_offset  = reader.readExpGolomb()
  }

  sps.width   = Math.ceil((((sps.pic_width_in_mbs_minus1 + 1) * 16) - sps.frame_crop_left_offset * 2 - sps.frame_crop_right_offset * 2))
  sps.height  = ((2 - sps.frame_mbs_only_flag) * (sps.pic_height_in_map_units_minus1 +1) * 16) - (sps.frame_crop_top_offset * 2) - (sps.frame_crop_bottom_offset * 2)

  let vui
  sps.vui_parameters_present_flag = reader.readBit()
  if (sps.vui_parameters_present_flag) {
    vui = {}

    vui.aspect_ratio_info_present_flag = reader.readBit()
    if (vui.aspect_ratio_info_present_flag) {

      vui.aspect_ratio_idc = reader.readBits(8)
      if (vui.aspect_ratio_idc === 255) {
        vui.sar_width   = reader.readBits(8)
        vui.sar_height  = reader.readBits(8)
      }

      vui.overscan_info_present_flag = reader.readBit()
      if (vui.overscan_info_present_flag) {
        vui.overscan_appropriate_flag = reader.readBit()
      }

      vui.video_signal_type_present_flag = reader.readBit()
      if (vui.video_signal_type_present_flag) {
        vui.video_format                    = reader.readBits(3)
        vui.video_full_range_flag           = reader.readBit()
        vui.color_description_present_flag  = reader.readBit()
        if (vui.color_description_present_flag) {
          vui.color_primaries          = reader.readBits(8)
          vui.transfer_characteristics = reader.readBits(8)
          vui.matrix_coefficients      = reader.readBits(8)
        }
      }

      vui.chroma_location_info_present_flag = reader.readBit()
      if (vui.chroma_loc_info_present_flag) {
        vui.chroma_sample_loc_type_top_field    = reader.readExpGolomb()
        vui.chroma_sample_loc_type_bottom_field = reader.readExpGolomb()
      }

      vui.timing_info_present_flag = reader.readBit()
      if (vui.timing_info_present_flag) {
        vui.num_units_in_tick     = reader.readBits(32)
        vui.time_scale            = reader.readBits(32)
        vui.fixed_frame_rate_flag = reader.readBit()
      }

      vui.nal_hrd_parameters_present_flag = reader.readBit()
      if (vui.nal_hrd_parameters_present_flag) {
        // FUCK
      }
    }
    sps.vui = vui
  }

  return sps
}

export class BitReader {

  constructor(input) {
    this.data       = input
    this.length     = input.byteLength
    this.currentBit = 0
  }

  currentBit() {
    return this.currentBit
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

  rewind(n) {
    this.currentBit -= n
  }

  atEnd() {
    if (this.currentBit >= this.data.length*8) { return true }
    return false
  }

}


export const packetGenerator = (packets) => {
  let packetIdx = -1
  return {
    next: () => {
      return packets[packetIdx++]
    }
  }
}

export const packetStreamGenerator = (packetGenerator) => {
  let currentPacket = packetGenerator.next()

  return {
    next: () => {
      currentPacket = packetGenerator.next()
      if (currentPacket) {
        if (currentPacket.constructor.name === 'Array') {
          return new BitReader(new Uint8Array(currentPacket))
        } else {
          let data = currentPacket.data
          if (currentPacket.data.constructor.name != 'Uint8Array') {
            data = new Uint8Array(data)
          }
          return new BitReader(data)
        }
      }
    },
    currentPacket: () => {
      return currentPacket
    }
  }
}

export const packetStreamBitReader = (packetStreamGenerator) => {
  let reader = packetStreamGenerator.next()
  return {

    readBit: () => {
      if (reader) {
        if (reader.currentBit < (reader.length * 8)) {
          return reader.readBit()
        } else {
          reader = packetStreamGenerator.next()
          if (reader) {
            return reader.readBit()
          }
        }
      }
    },

    readBits: (n) => {
      if (reader) {
        if (reader.currentBit < (reader.length * 8)) {
          return reader.readBits(n)
        } else {
          reader = packetStreamGenerator.next()
          if (reader) {
            return reader.readBits(n)
          }
        }
      }
    },

    currentBit: () => {
      if (reader) {
        return reader.currentBit
      }
    },

    currentPacket: () => {
      if (packetStreamGenerator) {
        return packetStreamGenerator.currentPacket()
      }
    },

    rewind: (n) => {
      if (reader) {
        reader.currentBit -= n
      }
    },

    atEnd() {
      if (reader) {
        return false
      }
      return true
    },
  }
}

export const streamReader = (packets) => {
  return packetStreamBitReader(packetStreamGenerator(packetGenerator(packets)))
}

export const elementaryStreamIterator = (es, delimiter, includeDelimiter) => {

  const reader  = constructBitReader(es)
  let isFirst   = true
  if (delimiter === undefined)        { delimiter = [0, 0, 0, 1] }
  if (includeDelimiter === undefined) { includeDelimiter = false }

  return {
    next: () => {

      let parse     = true
      let result    = []
      while (parse) {
        if(reader.atEnd()) {
          // If we're at the last result and need to prepend the delimiter
          if (result.length > 0) { if (includeDelimiter) { result.unshift(...delimiter) } }
          parse = false; break
        }

        let byte = reader.readBits(8)
        if (byte !== undefined) { result.push(byte) }

        const check = result.slice(-delimiter.length)
        if (equal(check, delimiter)) {
          if (!isFirst) {
            if (includeDelimiter) {
              result.unshift(...check)
              result = result.slice(0, -delimiter.length)
            } else {
              result = result.slice(0, -delimiter.length)
            }
            parse  = false; break
          } else {
            isFirst = false
            result = []
          }
        }
      }

      /// Outside parse loop
      if (result.length > 0) { return result }
      return undefined
    },

    reader: reader
  }

}

export const equal = (bufA, bufB) => {
  if (bufA.length != bufB.length) {
    return false
  }

  for (let i = 0 ; i != bufA.length ; i++) {
    if (bufA[i] != bufB[i]) { return false }
  }

  return true
}

const constructBitReader = (stream) => {
  let reader
  if (stream[0].constructor.name === 'Array') {
    reader = streamReader(stream)
  } else if(stream[0].constructor.name === 'MediaPacket') {
    reader = streamReader(stream)
  } else if(stream[0].constructor.name === 'PESPacket') {
    reader = streamReader(stream)
  } else {
    let buffer = new Uint8Array(stream)
    reader     = new BitReader(buffer)
  }
  return reader
}
