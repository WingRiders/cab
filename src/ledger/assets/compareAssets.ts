import {Asset} from '@/types/base'

export const compareAssets = (a: Asset, b: Asset) =>
  Buffer.from(a.policyId, 'hex').compare(Buffer.from(b.policyId, 'hex')) ||
  Buffer.from(a.assetName, 'hex').compare(Buffer.from(b.assetName, 'hex'))

export const matchAsset = (a: Asset | null) => (b: Asset | null) => {
  // if one of the assets is null, they match only if both of them are null
  if (!a) return !b
  return !!b && compareAssets(a, b) === 0
}
