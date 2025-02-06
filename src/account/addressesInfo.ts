import {Address, BIP32Path} from '@/types'

export type AddressWithMeta = {
  address: Address
  isUsed: boolean
  path: BIP32Path
}

export type AddressesInfo = {
  stakingAddress: Address
  baseExternal: AddressWithMeta[]
  enterpriseExternal: AddressWithMeta[]
  baseInternal: AddressWithMeta[]
  enterpriseInternal: AddressWithMeta[]
}

export const getAllAddresses = (addressesInfo: AddressesInfo) => [
  ...addressesInfo.baseExternal,
  ...addressesInfo.enterpriseExternal,
  ...addressesInfo.baseInternal,
  ...addressesInfo.enterpriseInternal,
]
