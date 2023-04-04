import {Asset} from '@/types/base'

export const compareAssets = (a: Asset, b: Asset) =>
  Buffer.from(a.policyId, 'hex').compare(Buffer.from(b.policyId, 'hex')) ||
  Buffer.from(a.assetName, 'hex').compare(Buffer.from(b.assetName, 'hex'))

export const matchAsset = (a: Asset) => (b: Asset) => compareAssets(a, b) === 0
