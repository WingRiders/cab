export enum SORT_ORDER {
  BORC_CANONICAL,
  ALPHABETICAL,
}

export enum ARRAY_ENCODING {
  ALWAYS_INDEFINITE,
  ZERO_LENGTH_FOR_EMPTY_FOR_OTHER_INDEFINITE,
  ALWAYS_DEFINITE,
}

export const MT = {
  POS_INT: 0,
  NEG_INT: 1,
  BYTE_STRING: 2,
  UTF8_STRING: 3,
  ARRAY: 4,
  MAP: 5,
  TAG: 6,
  SIMPLE_FLOAT: 7,
}

export const NUMBYTES = {
  ZERO: 0,
  ONE: 24,
  TWO: 25,
  FOUR: 26,
  EIGHT: 27,
  INDEFINITE: 31,
}

export function toType(obj: any) {
  // [object Type]
  // --------8---1
  return {}.toString.call(obj).slice(8, -1)
}
