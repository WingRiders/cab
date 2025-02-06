import {Address as HexAddress} from '../dappConnector'
import {BIP32Path, PubKeyHash, StakingHash} from './address'
import {Address as BechAddress} from './base'

export enum CryptoProviderFeature {
  MINIMAL,
  WITHDRAWAL,
  BULK_EXPORT,
  POOL_OWNER,
  MULTI_ASSET,
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
  address: BechAddress
}>

export type AddressWithMeta = {
  address: BechAddress
  bip32StringPath: string
  isUsed: boolean
}

export type AddressToPathMapping = {
  [key: string]: BIP32Path
}

export type AddressToPathMapper = (
  entry: BechAddress | HexAddress | PubKeyHash | StakingHash
) => BIP32Path
