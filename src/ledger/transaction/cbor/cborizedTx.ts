/**
 * TODO break this up
 * TxAux should go somewhere else
 */
import {Lovelace, HexString, TokenBundle, BigNumber, Hash32String} from '@/types/base'
import {AddrKeyHash} from '@/types/address'
import {
  TxCertificate,
  TxInput,
  TxOutput,
  TxWithdrawal,
  TxScript,
  TxDatum,
  TxRedeemer,
  TxRedeemerTag,
  TxWitnessSet,
  TxMetadata,
} from '@/types/transaction'
import {TxRelayType} from '@/types/stakepool'
import {NetworkId} from '@/types/network'
import {CborizedTxDatum} from './CborizedTxDatum'
import {Tagged} from 'borc'
import {CborInt64} from './CborInt64'
import {CatalystVotingRegistrationData} from '@/types/txPlan'

type encodeCBORFn = any // TODO: type

export type TxAuxData = {
  inputs: TxInput[]
  collateralInputs?: TxInput[]
  outputs: TxOutput[]
  fee: Lovelace
  mint?: TokenBundle
  ttl: number | BigNumber | null
  certificates: TxCertificate[]
  withdrawals: TxWithdrawal[]
  scripts?: TxScript[]
  datums?: TxDatum[]
  redeemers?: TxRedeemer[]
  validityIntervalStart: number | BigNumber | null
  requiredSigners?: AddrKeyHash[]
  networkId?: NetworkId
  scriptIntegrity?: Hash32String

  //metadata
  // the voting data is separated as it needs to be separately
  // signed by the wallets
  votingData?: CatalystVotingRegistrationData
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
}

export const enum TxWitnessKey {
  SHELLEY = 0,
  BYRON = 2,
  SCRIPTS = 3,
  DATA = 4,
  REDEEMERS = 5,
}

export const enum TxCertificateKey { // TODO: type would be a better name
  STAKING_KEY_REGISTRATION = 0,
  STAKING_KEY_DEREGISTRATION = 1,
  DELEGATION = 2,
  STAKEPOOL_REGISTRATION = 3,
}

export const enum TxStakeCredentialType {
  ADDR_KEYHASH = 0,
  // SCRIPTHASH = 1,
}

export type CborizedTxInput = [Buffer, number]

export type CborizedTxTokenBundle = Map<Buffer, Map<Buffer, number | CborInt64>>

export type CborizedTxValue = CborInt64 | [CborInt64, CborizedTxTokenBundle]

export type CborizedTxOutput = [Buffer, CborizedTxValue] | [Buffer, CborizedTxValue, Buffer]

export type CborizedPubKeyHash = Buffer

export type CborizedTxRedeemer = [
  TxRedeemerTag,
  number /* index */,
  CborizedTxDatum,
  [number /* memory */, number /* steps */] /* exunits */
]

export type CborizedTxScript = Buffer

export type CborizedTxWithdrawals = Map<Buffer, CborInt64>

export type CborizedTxStakingKeyRegistrationCert = [
  TxCertificateKey.STAKING_KEY_REGISTRATION,
  CborizedTxStakeCredential
]

export type CborizedTxStakingKeyDeregistrationCert = [
  TxCertificateKey.STAKING_KEY_DEREGISTRATION,
  CborizedTxStakeCredential
]

export type CborizedTxDelegationCert = [TxCertificateKey.DELEGATION, CborizedTxStakeCredential, Buffer]

// prettier-ignore
export type CborizedTxSingleHostIPRelay = [
  TxRelayType.SINGLE_HOST_IP,
  number?,
  Buffer?,
  Buffer?,
]

export type CborizedTxSingleHostNameRelay = [TxRelayType.SINGLE_HOST_NAME, number, string]

export type CborizedTxMultiHostNameRelay = [TxRelayType.MULTI_HOST_NAME, string]

export type CborizedTxStakepoolRegistrationCert = [
  TxCertificateKey.STAKEPOOL_REGISTRATION,
  Buffer,
  Buffer,
  CborInt64,
  CborInt64,
  Tagged /*{
    value: {
      0: number
      1: number
    }
  }*/,
  Buffer,
  Array<Buffer>,
  any,
  [string, Buffer] | null
]

export type CborizedTxCertificate =
  | CborizedTxDelegationCert
  | CborizedTxStakepoolRegistrationCert
  | CborizedTxStakingKeyDeregistrationCert
  | CborizedTxStakingKeyRegistrationCert

export type CborizedTxWitnessByron = [Buffer, Buffer, Buffer, Buffer]

export type CborizedTxWitnessShelley = [Buffer, Buffer]

export type CborizedTxWitnessValue =
  | CborizedTxWitnessByron
  | CborizedTxWitnessShelley
  | CborizedTxScript
  | CborizedTxDatum
  | CborizedTxRedeemer

export type CborizedTxBody = Map<TxBodyKey, any>
export type CborizedTxWitnesses = Map<TxWitnessKey, Array<CborizedTxWitnessValue>>

export type CborizedTxSigned = [CborizedTxBody, CborizedTxWitnesses, Buffer | null]

export type CborizedTxUnsigned = [CborizedTxBody, Buffer | null]

export type CborizedTxStakeCredential = [TxStakeCredentialType, Buffer]

export type CborizedCliWitness = [TxWitnessKey, CborizedTxWitnessShelley | CborizedTxWitnessByron]
