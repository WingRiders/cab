import {isAda} from '@/helpers/isAda'
import {Asset} from '@/types'

export const isHumanReadable = (value: string): boolean =>
  !!value && /^[a-zA-Z0-9!"#$%&'()*+,./:;<=>?@[\] ^_`{|}~-]*$/.test(value)

export const decodeAssetName = (asset: Asset): string => {
  if (isAda(asset)) {
    return 'ADA'
  }
  const decodedAssetName = Buffer.from(asset.assetName, 'hex').toString()
  return isHumanReadable(decodedAssetName) ? decodedAssetName : asset.assetName
}
