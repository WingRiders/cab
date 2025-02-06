import {blake2b as blake2b_from_blakejs} from 'blakejs'

export const blake2b = (input: Buffer, outputLen: number): Buffer =>
  Buffer.from(blake2b_from_blakejs(input, undefined, outputLen))
