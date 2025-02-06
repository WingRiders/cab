import {ExecutionUnits, Language as OgmiosLanguage} from '@cardano-ogmios/schema'
import {BigNumber} from 'bignumber.js'

import {ScriptHash} from '@/types/address'

import type * as api from '../dappConnector'
import {ARRAY_ENCODING} from '../ledger/transaction/cbor/cborTypes'
import {Address, Hash32String, HexString, Lovelace, TokenBundle} from './base'

export type TxInputRef = {
  txHash: string
  outputIndex: number
}

export type ReferenceScript = {
  txInputRef: TxInputRef
  scriptHash: ScriptHash
  // Specify spend redeemer for the input to be spent
  language: Language
  size: number
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
  // This field is filled when fetching UTxOs from cab-backend
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
  PLUTUS_V3 = 3,
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
  STAKE_REGISTRATION = 0,
  STAKE_DEREGISTRATION = 1,
  STAKE_DELEGATION = 2,
  VOTE_DELEGATION = 9,
}

export type TxCertificate =
  | TxStakeRegistrationCert
  | TxStakeDeregistrationCert
  | TxStakeDelegationCert
  | TxVoteDelegationCert

export type TxStakeRegistrationCert = {
  type: TxCertificateType.STAKE_REGISTRATION
  stakingAddress: Address
}

export type TxStakeDeregistrationCert = {
  type: TxCertificateType.STAKE_DEREGISTRATION
  stakingAddress: Address
}

export type TxStakeDelegationCert = {
  type: TxCertificateType.STAKE_DELEGATION
  stakingAddress: Address
  poolHash: string
}

export type TxVoteDelegationCert = {
  type: TxCertificateType.VOTE_DELEGATION
  stakingAddress: Address
  // Supporting only always-abstain vote to allow withdrawals
}

export type TxWithdrawal = {
  stakingAddress: Address
  rewards: Lovelace
}

export enum TxMetadatumLabel {
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

export type TxWitnessSet = {
  vKeyWitnesses?: TxShelleyWitness[]
  nativeScripts?: any // TODO
  plutusScripts?: TxScriptSource[]
  plutusDatums?: TxDatum[]
  redeemers?: TxRedeemer[]
}

export enum Language {
  PLUTUSV1 = 0, // id TAG used by cost models
  PLUTUSV2 = 1,
  PLUTUSV3 = 2,
}

export interface TxDatumConstr {
  i: number
  data: TxDatum[]
  __typeConstr: any
  __cborArrayEncoding?: ARRAY_ENCODING
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

export enum TxRedeemerTag {
  SPEND = 0,
  MINT = 1,
  CERT = 2,
  REWARD = 3,
}

type TxRedeemerBase = {
  tag: TxRedeemerTag
  data: TxDatum
  exUnits: ExecutionUnits
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
      scriptSize: number
      language: Language
      isReferenceScript: true
    }

export type TxSubmission = {txHash: string}

export enum PlutusScriptVersion {
  PlutusScriptV1 = 'PlutusScriptV1',
  PlutusScriptV2 = 'PlutusScriptV2',
  PlutusScriptV3 = 'PlutusScriptV3',
}

export enum ScriptLanguageTag {
  PLUTUS_SCRIPT_V1 = 'plutus:v1',
  PLUTUS_SCRIPT_V2 = 'plutus:v2',
  PLUTUS_SCRIPT_V3 = 'plutus:v3',
}

export const PLUTUS_SCRIPT_VERSION_PREFIX = {
  [PlutusScriptVersion.PlutusScriptV1]: '01',
  [PlutusScriptVersion.PlutusScriptV2]: '02',
  [PlutusScriptVersion.PlutusScriptV3]: '03',
}

export const PLUTUS_SCRIPT_VERSION_TO_LANGUAGE = {
  [PlutusScriptVersion.PlutusScriptV1]: Language.PLUTUSV1,
  [PlutusScriptVersion.PlutusScriptV2]: Language.PLUTUSV2,
  [PlutusScriptVersion.PlutusScriptV3]: Language.PLUTUSV3,
}

export const LANGUAGE_TO_TX_SCRIPT_TYPE = {
  [Language.PLUTUSV1]: TxScriptType.PLUTUS_V1,
  [Language.PLUTUSV2]: TxScriptType.PLUTUS_V2,
  [Language.PLUTUSV3]: TxScriptType.PLUTUS_V3,
}

export const LANGUAGE_TO_SCRIPT_LANGUAGE_TAG = {
  [Language.PLUTUSV1]: ScriptLanguageTag.PLUTUS_SCRIPT_V1,
  [Language.PLUTUSV2]: ScriptLanguageTag.PLUTUS_SCRIPT_V2,
  [Language.PLUTUSV3]: ScriptLanguageTag.PLUTUS_SCRIPT_V3,
}

export const OGMIOS_LANGUAGE_TO_LANGUAGE: Record<OgmiosLanguage, Language> = {
  'plutus:v1': Language.PLUTUSV1,
  'plutus:v2': Language.PLUTUSV2,
  'plutus:v3': Language.PLUTUSV3,
}
