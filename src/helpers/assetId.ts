import {Asset, HexString} from '@/types'

import {AdaAsset} from '../constants'
import {POLICY_ID_SIZE} from '../ledger/transaction/txConstants'

export const assetId = <T extends Asset | null>(asset: T): T extends Asset ? HexString : null => {
  return (asset !== null ? `${asset.policyId}${asset.assetName}`.toLowerCase() : null) as T extends Asset
    ? HexString
    : null
}

export const assetFromId = (id: string): Asset => {
  if (id === assetId(AdaAsset)) return AdaAsset

  const policyIdBuffer = Buffer.from(id, 'hex').subarray(0, POLICY_ID_SIZE)
  const policyId = policyIdBuffer.toString('hex')
  const assetName = id.slice(policyId.length)

  // assuming assetName should have at least one character
  if (policyIdBuffer.length !== POLICY_ID_SIZE || assetName.length === 0) {
    throw new Error(`Couldn't decode asset id: ${id}`)
  }

  return {policyId, assetName}
}
