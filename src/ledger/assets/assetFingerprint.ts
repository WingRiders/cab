import {bech32} from 'cardano-crypto.js'

import {blake2b, isAda} from '@/helpers'
import {Asset} from '@/types'
import {HexString} from '@/types/base'

// TODO: we might want to add this to cardano-crypto.js

export const encodeAssetFingerprint = (policyIdHex: HexString, assetNameHex: HexString): string => {
  const data = blake2b(
    Buffer.concat([Buffer.from(policyIdHex, 'hex'), Buffer.from(assetNameHex, 'hex')]),
    20
  )
  return bech32.encode('asset', data)
}

export const getAssetFingerprint = (asset: Asset) =>
  isAda(asset) ? undefined : encodeAssetFingerprint(asset.policyId, asset.assetName)
