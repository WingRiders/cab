import {encode} from 'borc'
import {
  AddressTypes,
  base58,
  bech32,
  getAddressType,
  getPubKeyBlake2b224Hash,
  getShelleyAddressNetworkId,
  hasSpendingScript as ccHasSpendingScript,
  packBaseAddress,
  packEnterpriseAddress,
  packRewardAddress,
} from 'cardano-crypto.js'

import {BIP32Path, StakingHash} from '@/types/address'
import {Address, HexString} from '@/types/base'
import {NetworkId} from '@/types/network'

import {HARDENED_THRESHOLD} from './addressConstants'

export const encodeAddress = (address: Buffer): Address => {
  const addressType = getAddressType(address)
  if (addressType === AddressTypes.BOOTSTRAP) {
    return base58.encode(address) as Address
  }

  const prefix = [AddressTypes.REWARD, AddressTypes.REWARD_SCRIPT].includes(addressType)
    ? 'stake'
    : 'addr'

  const useTestPrefix = [NetworkId.PREPROD].includes(getShelleyAddressNetworkId(address))
  const addressPrefix = `${prefix}${useTestPrefix ? '_test' : ''}`
  return bech32.encode(addressPrefix, address) as Address
}

export const encodeCatalystVotingKey = (votingKey: HexString): string => {
  return bech32.encode('ed25519_pk', Buffer.from(votingKey, 'hex'))
}

export const xpub2pub = (xpub: Buffer) => xpub.slice(0, 32)

export const xpub2ChainCode = (xpub: Buffer) => xpub.slice(32, 64)

// takes xpubkey, converts it to pubkey and then to 28 byte blake2b encoded hash
const xpub2blake2b224Hash = (xpub: Buffer) => getPubKeyBlake2b224Hash(xpub2pub(xpub))

// TODO: do this more precisely
export const isShelleyPath = (path: BIP32Path) => path[0] - HARDENED_THRESHOLD === 1852

// TODO: do this properly with cardano-crypto unpackAddress
export const isV1Address = (address: string) => address.startsWith('D')

export const xpubHexToCborPubHex = (xpubHex: HexString) =>
  encode(Buffer.from(xpubHex, 'hex').slice(0, 32)).toString('hex')

// TODO: replace this with isValidShelleyAddress from cardano-crypto.js
export const isShelleyFormat = (address: string): boolean => {
  return address.startsWith('addr') || address.startsWith('stake')
}

export const bechAddressToHex = (address: string): HexString => {
  if (!isShelleyFormat(address)) throw new Error('Invalid address')
  const parsed = bech32.decode(address)
  return parsed.data.toString('hex')
}

export const base58AddressToHex = (address: string): HexString => {
  const parsed = base58.decode(address)
  return parsed.toString('hex')
}

export const stakingAddressFromXpub = (stakeXpub: Buffer, networkId: NetworkId): Address => {
  const addrBuffer: Buffer = packRewardAddress(xpub2blake2b224Hash(stakeXpub), networkId)
  return encodeAddress(addrBuffer)
}

export const baseAddressFromXpub = (
  spendXpub: Buffer,
  stakeXpub: Buffer,
  networkId: NetworkId
): Address => {
  const addrBuffer = packBaseAddress(
    xpub2blake2b224Hash(spendXpub),
    xpub2blake2b224Hash(stakeXpub),
    networkId
  )
  return encodeAddress(addrBuffer)
}

export const enterpriseAddressFromXpub = (spendXpub: Buffer, networkId: NetworkId): Address => {
  const addrBuffer = packEnterpriseAddress(xpub2blake2b224Hash(spendXpub), networkId)
  return encodeAddress(addrBuffer)
}

export const isBase = (address: HexString): boolean => {
  return getAddressType(Buffer.from(address, 'hex')) === AddressTypes.BASE
}

export const isByron = (address: HexString): boolean => {
  return getAddressType(Buffer.from(address, 'hex')) === AddressTypes.BOOTSTRAP
}

export const addressToHex = (address: Address): HexString =>
  // TODO: we should restrict the type of address to Address and in that case
  // we dont need to validate the address
  isShelleyFormat(address) ? bechAddressToHex(address) : base58AddressToHex(address)

export const addressType = (address: Address): AddressTypes => {
  const addressBuffer = shelleyAddressToBuffer(address)
  return getAddressType(addressBuffer)
}

export const hasSpendingScript = (address: Address): boolean => {
  const addressBuffer = shelleyAddressToBuffer(address)
  return ccHasSpendingScript(addressBuffer)
}

export const spendingHashFromAddress = (address: Address): HexString => {
  const addressBuffer = shelleyAddressToBuffer(address)
  const addressesWithSpendingHash = [
    AddressTypes.BASE,
    AddressTypes.BASE_SCRIPT_KEY,
    AddressTypes.BASE_KEY_SCRIPT,
    AddressTypes.BASE_SCRIPT_SCRIPT,
    AddressTypes.POINTER,
    AddressTypes.POINTER_SCRIPT,
    AddressTypes.ENTERPRISE,
    AddressTypes.ENTERPRISE_SCRIPT,
  ]
  if (!addressesWithSpendingHash.includes(getAddressType(addressBuffer))) {
    throw new Error(`Invalid address ${address} type: ${getAddressType(addressBuffer)}`)
  }
  // the address has a 1 byte header followed by spending hash
  return addressBuffer.slice(1, 29).toString('hex')
}

export const stakingHashFromAddress = (address: Address): StakingHash => {
  if (!isShelleyFormat(address)) throw new Error('Invalid address')
  const addressBuffer = bech32.decode(address).data
  const baseTypes = [
    AddressTypes.BASE,
    AddressTypes.BASE_SCRIPT_KEY,
    AddressTypes.BASE_KEY_SCRIPT,
    AddressTypes.BASE_SCRIPT_SCRIPT,
  ]
  const rewardTypes = [AddressTypes.REWARD, AddressTypes.REWARD_SCRIPT]
  if (baseTypes.includes(getAddressType(addressBuffer))) {
    // the address has a 1 byte header followed by spending hash then by the staking hash
    return addressBuffer.slice(29).toString('hex') as StakingHash
  } else if (rewardTypes.includes(getAddressType(addressBuffer))) {
    // the address has a 1 byte header followed by staking hash
    return addressBuffer.slice(1).toString('hex') as StakingHash
  } else {
    throw new Error(`Invalid staking address ${address} type: ${getAddressType(addressBuffer)}`)
  }
}

export const safeStakingHashFromAddress = (address: Address): StakingHash | undefined => {
  try {
    return stakingHashFromAddress(address)
  } catch {
    return undefined
  }
}

function shelleyAddressToBuffer(address: Address) {
  if (!isShelleyFormat(address)) throw new Error('Invalid address')
  const addressBuffer = bech32.decode(address).data
  return addressBuffer
}

export const rewardAddressFromAddress = (address: Address): Buffer => {
  if (!isShelleyFormat(address)) throw new Error('Invalid address')
  const addressBuffer = bech32.decode(address).data
  switch (getAddressType(addressBuffer)) {
    case AddressTypes.BASE:
    case AddressTypes.BASE_SCRIPT_KEY:
      return packRewardAddress(addressBuffer.slice(29), getShelleyAddressNetworkId(addressBuffer), false)
    case AddressTypes.BASE_KEY_SCRIPT:
    case AddressTypes.BASE_SCRIPT_SCRIPT:
      return packRewardAddress(addressBuffer.slice(29), getShelleyAddressNetworkId(addressBuffer), true)
    case AddressTypes.REWARD:
    case AddressTypes.REWARD_SCRIPT:
      return addressBuffer
    default:
      throw new Error(`Invalid staking address ${address} type: ${getAddressType(addressBuffer)}`)
  }
}

export const compareAddressSpendingHash = (address: Address, scriptHash: string) => {
  try {
    const validatorHash = spendingHashFromAddress(address)
    return validatorHash === scriptHash
  } catch (error) {
    // we can safely ignore invalid addresses here, since they wouldn't equal to any script hash
    return false
  }
}
