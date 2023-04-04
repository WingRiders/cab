import {Address, Lovelace, TokenBundle, HexString, Hash32String} from './base'
import {TxPoolParams} from './stakepool'
import {BigNumber} from 'bignumber.js'
import type * as api from '../dappConnector'

export type UTxO = {
  txHash: string
  address: Address
  coins: Lovelace
  tokenBundle: TokenBundle
  outputIndex: number
  datum?: TxDatum
  datumHash?: HexString
  creationTime?: Date
}

export type UTxOWithRef<TUTxO extends UTxO> = {
  utxoRef: api.TxInput
  _utxo: TUTxO
}

export type TxInput = UTxO

export type TxOutput = {
  isChange: boolean
  address: Address
  coins: Lovelace
  tokenBundle: TokenBundle
  dataHash?: Hash32String
}

// <txhash>#<outputIndex>
export type TxOutputId = string & {__type: 'TxOutputId'}

export enum TxCertificateType {
  STAKING_KEY_REGISTRATION = 0,
  STAKING_KEY_DEREGISTRATION = 1,
  DELEGATION = 2,
  STAKEPOOL_REGISTRATION = 3,
}

export type TxCertificate =
  | TxStakingKeyRegistrationCert
  | TxStakingKeyDeregistrationCert
  | TxDelegationCert
  | TxStakepoolRegistrationCert

export type TxStakingKeyRegistrationCert = {
  type: TxCertificateType.STAKING_KEY_REGISTRATION
  stakingAddress: Address
}

export type TxStakingKeyDeregistrationCert = {
  type: TxCertificateType.STAKING_KEY_DEREGISTRATION
  stakingAddress: Address
}

export type TxDelegationCert = {
  type: TxCertificateType.DELEGATION
  stakingAddress: Address
  poolHash: string
}

export type TxStakepoolRegistrationCert = {
  type: TxCertificateType.STAKEPOOL_REGISTRATION
  stakingAddress: Address
  poolRegistrationParams: TxPoolParams
}

export type TxWithdrawal = {
  stakingAddress: Address
  rewards: Lovelace
}

export const enum TxMetadatumLabel {
  CATALYST_VOTING_REGISTRATION_DATA = 61284,
  CATALYST_VOTING_SIGNATURE = 61285,
  MESSAGE = 674,
}

// TODO add support for larger ints than js number
export type TxMetadatum =
  | number
  | string /* max 64 bytes */
  | Buffer /* max 64 bytes */
  | TxMetadatum[]
  | Map<TxMetadatum, TxMetadatum>

export type TxMetadata = Map<TxMetadatumLabel | number /* allow custom keys */, TxMetadatum>

export type TxShelleyWitness = {
  publicKey: Buffer
  signature: Buffer
}

export type TxByronWitness = {
  publicKey: Buffer
  signature: Buffer
  chainCode: Buffer
  addressAttributes: any // TODO:
}

export type TxWitnessSet = {
  vKeyWitnesses?: TxShelleyWitness[]
  nativeScripts?: any // TODO
  bootstrapWitnesses?: TxByronWitness[]
  plutusScripts?: TxScript[]
  plutusDatums?: TxDatum[]
  redeemers?: TxRedeemer[]
}

export const enum Language {
  PLUTUSV1 = 0, // id TAG used by cost models
}

export interface TxDatumConstr {
  i: number
  data: TxDatum[]
  __typeConstr: any
}

export type TxDatum =
  | string // also used for empty as ""
  | number
  | BigNumber
  | Buffer
  | Map<TxDatum, TxDatum>
  | TxDatum[]
  | TxDatumConstr // used for typed schemas

export type TxExUnits = {
  memory: number
  steps: number
}

export const enum TxRedeemerTag {
  SPEND = 0,
  MINT = 1,
  CERT = 2,
  REWARD = 3,
}

type TxRedeemerBase = {
  tag: TxRedeemerTag
  data: TxDatum
  exUnits: TxExUnits
}

export type TxSpendRedeemer = TxRedeemerBase & {
  tag: TxRedeemerTag.SPEND
  ref: {txHash: HexString; outputIndex: number}
}

export type TxMintRedeemer = TxRedeemerBase & {
  tag: TxRedeemerTag.MINT
  ref: {policyId: HexString}
}

export type TxRedeemer =
  | TxSpendRedeemer
  | TxMintRedeemer
  | /* TODO */ (TxRedeemerBase & {tag: TxRedeemerTag.CERT | TxRedeemerTag.REWARD; index: number})

export type TxScript = {
  bytes: Buffer // decoded! bytes from .plutus file cborHex
}
