/**
 * TODO break this up
 * TxAux should go somewhere else
 */

import {AddrKeyHash} from '@/types/address'
import {BigNumber, Hash32String, HexString, Lovelace, TokenBundle} from '@/types/base'
import {NetworkId} from '@/types/network'
import {
  TxCertificate,
  TxDatum,
  TxInput,
  TxInputRef,
  TxMetadata,
  TxOutput,
  TxRedeemer,
  TxRedeemerTag,
  TxScriptSource,
  TxWithdrawal,
  TxWitnessSet,
} from '@/types/transaction'

import {CborInt64} from './CborInt64'
import {CborizedTxDatum} from './CborizedTxDatum'
import {CborizedTxInlineDatum} from './CborizedTxInlineDatum'
import {CborizedTxScriptRef} from './CborizedTxScriptRef'

type encodeCBORFn = any // TODO: type

export type TxAuxData = {
  inputs: TxInput[]
  referenceInputs?: TxInputRef[]
  collateralInputs?: TxInput[]
  outputs: TxOutput[]
  fee: Lovelace
  mint?: TokenBundle
  ttl: number | BigNumber | null
  certificates: TxCertificate[]
  withdrawals: TxWithdrawal[]
  scripts?: TxScriptSource[]
  datums?: TxDatum[]
  redeemers?: TxRedeemer[]
  validityIntervalStart: number | BigNumber | null
  requiredSigners?: AddrKeyHash[]
  networkId?: NetworkId
  scriptIntegrity?: Hash32String

  // metadata
  // precomputed if no metadata, otherwise set when setting signature
  auxiliaryDataHash: HexString
  metadata?: TxMetadata | null
}

export type TxAux = TxAuxData & {
  getId: () => HexString
  encodeCBOR: encodeCBORFn
}

export type CborizedTxStructured = {
  getId: () => HexString
  getWitnessSet: () => TxWitnessSet
  encodeCBOR: encodeCBORFn
}

export type TxSigned = {
  txBody: HexString
  txHash: HexString
}

// TX

export const enum TxBodyKey {
  INPUTS = 0,
  OUTPUTS = 1,
  FEE = 2,
  TTL = 3,
  CERTIFICATES = 4,
  WITHDRAWALS = 5,
  AUXILIARY_DATA_HASH = 7,
  VALIDITY_INTERVAL_START = 8,
  MINT = 9,
  SCRIPT_DATA_HASH = 11,
  COLLATERAL_INPUTS = 13,
  REQUIRED_SIGNERS = 14,
  NETWORK_ID = 15,
  REFERENCE_INPUTS = 18,
}

export const enum TxWitnessKey {
  SHELLEY = 0,
  SCRIPTS_V1 = 3,
  DATA = 4,
  REDEEMERS = 5,
  SCRIPTS_V2 = 6,
}

export const enum TxCertificateKey { // TODO: type would be a better name
  STAKE_REGISTRATION = 0,
  STAKE_DEREGISTRATION = 1,
  STAKE_DELEGATION = 2,
  VOTE_DELEGATION = 9,
}

export const enum TxStakeCredentialType {
  ADDR_KEYHASH = 0,
  // SCRIPTHASH = 1,
}

export type CborizedTxInput = [Buffer, number]

export type CborizedTxTokenBundle = Map<Buffer, Map<Buffer, number | CborInt64>>

export type CborizedTxValue = CborInt64 | [CborInt64, CborizedTxTokenBundle]

export const enum TxOutputKey {
  OUTPUT_KEY_ADDRESS = 0,
  OUTPUT_KEY_VALUE = 1,
  OUTPUT_KEY_DATUM_OPTION = 2,
  OUTPUT_KEY_SCRIPT_REF = 3,
}

export type CborizedDatumOption = [0, Buffer] | [1, CborizedTxInlineDatum]
export type CborizedTxOutput =
  | [Buffer, CborizedTxValue]
  | [Buffer, CborizedTxValue, Buffer]
  | Map<TxOutputKey, Buffer | CborizedTxValue | CborizedDatumOption | CborizedTxScriptRef>

export type CborizedPubKeyHash = Buffer

export type CborizedTxRedeemer = [
  TxRedeemerTag,
  number /* index */,
  CborizedTxDatum,
  [number /* memory */, number /* cpu */] /* exunits */
]

export type CborizedTxScript = Buffer

export type CborizedTxWithdrawals = Map<Buffer, CborInt64>

export type CborizedTxStakeRegistrationCert = [
  TxCertificateKey.STAKE_REGISTRATION,
  CborizedTxStakeCredential
]

export type CborizedTxStakeDeregistrationCert = [
  TxCertificateKey.STAKE_DEREGISTRATION,
  CborizedTxStakeCredential
]

export type CborizedTxStakeDelegationCert = [
  TxCertificateKey.STAKE_DELEGATION,
  CborizedTxStakeCredential,
  Buffer
]

export const enum DRepType {
  KEY_HASH = 0,
  SCRIPT_HASH = 1,
  ALWAYS_ABSTAIN = 2,
  ALWAYS_NO_CONFIDENCE = 3,
}

export type CborizedDRep =
  | [DRepType.KEY_HASH, Buffer]
  | [DRepType.SCRIPT_HASH, Buffer]
  | [DRepType.ALWAYS_ABSTAIN]
  | [DRepType.ALWAYS_NO_CONFIDENCE]

export type CborizedTxVoteDelegationCert = [
  TxCertificateKey.VOTE_DELEGATION,
  CborizedTxStakeCredential,
  CborizedDRep
]

export type CborizedTxCertificate =
  | CborizedTxStakeDelegationCert
  | CborizedTxStakeDeregistrationCert
  | CborizedTxStakeRegistrationCert
  | CborizedTxVoteDelegationCert

export type CborizedTxWitnessShelley = [Buffer, Buffer]

export type CborizedTxWitnessValue =
  | CborizedTxWitnessShelley
  | CborizedTxScript
  | CborizedTxDatum
  | CborizedTxRedeemer

export type CborizedTxBody = Map<TxBodyKey, any>
export type CborizedTxWitnesses = Map<TxWitnessKey, Array<CborizedTxWitnessValue>>

export type CborizedTxSigned = [CborizedTxBody, CborizedTxWitnesses, Buffer | null]

export type CborizedTxUnsigned = [CborizedTxBody, Buffer | null]

export type CborizedTxStakeCredential = [TxStakeCredentialType, Buffer]

export type CborizedCliWitness = [TxWitnessKey, CborizedTxWitnessShelley]
