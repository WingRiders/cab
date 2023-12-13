import {BigNumber} from 'bignumber.js'

import {ScriptHash} from '@/types/address'

import type * as api from '../dappConnector'
import {Address, Hash32String, HexString, Lovelace, TokenBundle} from './base'
import {TxPoolParams} from './stakepool'

export type TxInputRef = {
  txHash: string
  outputIndex: number
}

export type ReferenceScript = {
  txInputRef: TxInputRef
  scriptHash: ScriptHash
  // Specify spend redeemer for the input to be spent
  language: Language
}

export type UTxO = TxInputRef & {
  address: Address
  coins: Lovelace
  tokenBundle: TokenBundle
  datum?: TxDatum
  datumHash?: HexString
  creationTime?: Date

  // babbage additions
  // TODO https://github.com/WingRiders/cardano-dex/issues/4074
  inlineDatum?: boolean
  inlineScript?: TxScript
  // This field is filled when fetching UTxOs from explorer
  // and used to exclude reference script UTxOs from being used as inputs
  // when additional ada is required.
  hasInlineScript?: boolean
}

export type UTxOWithRef<TUTxO extends UTxO> = {
  utxoRef: api.TxInput
  _utxo: TUTxO
}

export type TxInput = UTxO

export enum TxOutputType {
  LEGACY = 0,
  POST_ALONZO = 1,
}

export enum TxDatumOptionType {
  HASH = 0,
  INLINED_DATUM = 1,
}

export enum TxScriptType {
  NATIVE = 0,
  PLUTUS_V1 = 1,
  PLUTUS_V2 = 2,
}

export type TxDatumOption =
  | {
      type: TxDatumOptionType.HASH
      hash: Hash32String
    }
  | {
      type: TxDatumOptionType.INLINED_DATUM
      datum: TxDatum
    }

export type TxOutput = {
  isChange: boolean
  address: Address
  coins: Lovelace
  tokenBundle: TokenBundle
} & (
  | {
      type: TxOutputType.LEGACY
      datumHash?: Hash32String
    }
  | {
      type: TxOutputType.POST_ALONZO
      datumOption?: TxDatumOption
      scriptRef?: TxScript
    }
)

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

export enum TxMetadatumLabel {
  CATALYST_VOTING_REGISTRATION_DATA = 61284,
  CATALYST_VOTING_SIGNATURE = 61285,
  MESSAGE = 674,
  NFT = 721,
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
  plutusScripts?: TxScriptSource[]
  plutusDatums?: TxDatum[]
  redeemers?: TxRedeemer[]
}

export enum Language {
  PLUTUSV1 = 0, // id TAG used by cost models
  PLUTUSV2 = 1,
}

export interface TxDatumConstr {
  i: number
  data: TxDatum[]
  __typeConstr: any
}

export interface TxSimpleDatum {
  data: TxDatum
  __simpleDatum: any
}

export type TxDatum =
  | string // also used for empty as ""
  | number
  | BigNumber
  | Buffer
  | Map<TxDatum, TxDatum>
  | TxDatum[]
  | TxDatumConstr // used for typed schemas
  | TxSimpleDatum // used for typed schemas

export type TxExUnits = {
  memory: number
  steps: number
}

export enum TxRedeemerTag {
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
  language: Language
  isReferenceScript?: false
}

export type TxScriptSource =
  | TxScript
  | {
      // When doing serialization of witness set, skip reference scripts
      txInputRef: TxInputRef
      scriptHash: ScriptHash
      language: Language
      isReferenceScript: true
    }

export enum PlutusScriptVersion {
  PlutusScriptV1 = 'PlutusScriptV1',
  PlutusScriptV2 = 'PlutusScriptV2',
}

export const PLUTUS_SCRIPT_VERSION_PREFIX = {
  [PlutusScriptVersion.PlutusScriptV1]: '01',
  [PlutusScriptVersion.PlutusScriptV2]: '02',
}

export const PLUTUS_SCRIPT_VERSION_TO_LANGUAGE = {
  [PlutusScriptVersion.PlutusScriptV1]: Language.PLUTUSV1,
  [PlutusScriptVersion.PlutusScriptV2]: Language.PLUTUSV2,
}

export const LANGUAGE_TO_TX_SCRIPT_TYPE = {
  [Language.PLUTUSV1]: TxScriptType.PLUTUS_V1,
  [Language.PLUTUSV2]: TxScriptType.PLUTUS_V2,
}
