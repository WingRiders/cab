import {HexString} from '@/types/base'
import {bech32, blake2b} from 'cardano-crypto.js'
import {Asset} from '@/types'
import {isAda} from '@/helpers'

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
