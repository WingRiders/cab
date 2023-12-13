import {BaseAddressTypes, packBaseAddress, packEnterpriseAddress} from 'cardano-crypto.js'

import {Address as BechAddress, NetworkId} from '@/types'

import {encodeAddress} from '../address'
import {
  Address,
  AddressCredential,
  Just,
  Maybe,
  Nothing,
  PubKeyCredential,
  ScriptCredential,
  StakingCredential,
  StakingHash,
} from './datumTypes'

const getBaseAddressType = (
  paymentCredential: AddressCredential,
  stakingCredential: AddressCredential
) => {
  if (paymentCredential.i === ScriptCredential.CONSTR) {
    return stakingCredential.i === ScriptCredential.CONSTR
      ? BaseAddressTypes.SCRIPT_SCRIPT
      : BaseAddressTypes.SCRIPT_KEY
  }
  return stakingCredential.i === ScriptCredential.CONSTR
    ? BaseAddressTypes.KEY_SCRIPT
    : BaseAddressTypes.BASE
}

export const addressStakingCredentialToAddressCredential = (
  maybeStakingCredential: Maybe<StakingCredential>
): AddressCredential | null => {
  if (maybeStakingCredential instanceof Nothing) {
    // No staking credential return empty string
    return null
  }
  if (maybeStakingCredential instanceof Just) {
    const stakingCredential = maybeStakingCredential.value as StakingCredential
    if (stakingCredential instanceof StakingHash) {
      return stakingCredential.credential
    }
    // We currently don't support StakingPtr
    throw new Error('Not implemented')
  }
  throw Error('Unsupported Maybe instance')
}

export const addressCredentialToHexString = (addressCredential: AddressCredential): string => {
  if (addressCredential instanceof ScriptCredential) {
    return addressCredential.scriptHash
  }
  if (addressCredential instanceof PubKeyCredential) {
    return addressCredential.pubKeyHash
  }
  throw Error('Unsupported AddressCredential instance')
}

const addressToBuffer = (address: Address, networkId: NetworkId): Buffer => {
  const stakingAddressCredential = addressStakingCredentialToAddressCredential(
    address.addressStakingCredential
  )
  // no staking part, it's an enterprise address
  if (stakingAddressCredential === null) {
    return packEnterpriseAddress(
      Buffer.from(addressCredentialToHexString(address.addressCredential), 'hex'),
      networkId,
      address.addressCredential.i === ScriptCredential.CONSTR
    )
  }

  // otherwise the address must be a base address, no other type is supported
  return packBaseAddress(
    Buffer.from(addressCredentialToHexString(address.addressCredential), 'hex'),
    Buffer.from(addressCredentialToHexString(stakingAddressCredential), 'hex'),
    networkId,
    getBaseAddressType(address.addressCredential, stakingAddressCredential)
  )
}

export const addressToBechAddress = (address: Address, networkId: NetworkId): BechAddress =>
  encodeAddress(addressToBuffer(address, networkId))

export const areAddressesEqual = (address1: Address, address2: Address): boolean => {
  if (
    addressCredentialToHexString(address1.addressCredential) !==
    addressCredentialToHexString(address2.addressCredential)
  ) {
    return false
  }

  const stake1 = addressStakingCredentialToAddressCredential(address1.addressStakingCredential)
  const stake2 = addressStakingCredentialToAddressCredential(address2.addressStakingCredential)
  if (stake1 === null || stake2 === null) {
    return stake1 === null && stake2 === null
  }
  return addressCredentialToHexString(stake1) === addressCredentialToHexString(stake2)
}
