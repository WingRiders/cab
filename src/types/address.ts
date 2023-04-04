import {HexString} from './base'

export {AddressTypes} from 'cardano-crypto.js'

export type BIP32Path = number[]

export type XPubKey = {
  path: number[]
  xpubHex: HexString
}

export type PubKeyHash = HexString & {__typePubKeyHash: any}
export type StakingHash = HexString & {__typeStakingHash: any}
export type AddrKeyHash = PubKeyHash | StakingHash
export type ScriptHash = HexString & {__typeScriptHash: any}
