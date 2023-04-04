import {HexString} from '@/types/base'

export const assetNameHex2Readable = (assetNameHex: HexString) =>
  Buffer.from(assetNameHex, 'hex').toString()
