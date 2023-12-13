import {BIP32Path, PubKeyHash, StakingHash, XPubKey} from './address'
import {Address, Lovelace, TokenBundle} from './base'
import {StakePoolInfoExtended} from './stakepool'

export enum CryptoProviderFeature {
  MINIMAL,
  WITHDRAWAL,
  BULK_EXPORT,
  POOL_OWNER,
  MULTI_ASSET,
  VOTING,
  MINTING,
  PLUTUS,
}

export type CryptoProviderVersion = {
  major: number
  minor: number
  patch: number
}

export type DerivationScheme = {
  type: 'v1' | 'v2'
  ed25519Mode: number
  keyfileVersion: string
}

export type WalletSecretDef = {
  rootSecret: Buffer
  derivationScheme: DerivationScheme
}

export type AddressProvider = (i: number) => Promise<{
  path: BIP32Path
  address: Address
}>

export type AddressWithMeta = {
  address: Address
  bip32StringPath: string
  isUsed: boolean
}

export type AddressToPathMapping = {
  [key: string]: BIP32Path
}

export type AddressToPathMapper = (entry: Address | PubKeyHash | StakingHash) => BIP32Path

export type BaseAccountInfo = {
  shelleyAccountXpub: XPubKey
  stakingXpub: XPubKey
  stakingAddress: Address
  balance: Lovelace
  collateralsAmount: Lovelace
  tokenBalance: TokenBundle
  usedAddresses: Array<AddressWithMeta>
  unusedAddresses: Array<AddressWithMeta>
  visibleAddresses: Array<AddressWithMeta>
  isUsed: boolean
  accountIndex: number
}

export type AccountInfo = BaseAccountInfo & {
  stakingInfo: {
    currentEpoch: number
    isStakeKeyRegistered: boolean
    delegation: StakePoolInfoExtended & {
      retiringEpoch: number | null
      url: string
    }
    rewards: Lovelace
  }
}

export type TokenRegistrySubject = string & {__typeTokenRegistrySubject: any}

export type RegisteredTokenMetadata = {
  subject: TokenRegistrySubject
  description: string
  name: string
  ticker?: string
  symbol?: string
  url?: string
  logoBase64?: string
  decimals?: number
}
