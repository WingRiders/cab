import {BaseAddressTypes, packBaseAddress, packEnterpriseAddress} from 'cardano-crypto.js'

import {StakingHash} from '@/types'
import {HexString} from '@/types/base'

import {encodeAddress} from './addressHelpers'

export function scriptHashToEnterpriseAddress(hash: HexString, networkId: number) {
  const address = packEnterpriseAddress(Buffer.from(hash, 'hex'), networkId, true)
  return encodeAddress(address)
}

export function scriptHashToBaseAddress(
  scriptHash: HexString,
  stakeKeyHash: StakingHash,
  networkId: number
) {
  const address = packBaseAddress(
    Buffer.from(scriptHash, 'hex'),
    Buffer.from(stakeKeyHash, 'hex'),
    networkId,
    BaseAddressTypes.SCRIPT_KEY
  )
  return encodeAddress(address)
}

export function scriptHashToAddress(
  networkId: number,
  scriptHash: HexString,
  stakeKeyHash?: StakingHash
) {
  return stakeKeyHash
    ? scriptHashToBaseAddress(scriptHash, stakeKeyHash, networkId)
    : scriptHashToEnterpriseAddress(scriptHash, networkId)
}
