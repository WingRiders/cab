import {ProtocolParameters} from './protocolParameters'
import {AddrKeyHash, BIP32Path} from './address'
import {Address, HexString, Lovelace, TokenBundle} from './base'
import {
  UTxO,
  TxCertificate,
  TxInput,
  TxOutput,
  TxWithdrawal,
  TxDatum,
  TxRedeemer,
  TxScript,
  TxMintRedeemer,
  TxSpendRedeemer,
  TxMetadata,
} from './transaction'

export type ValidityInterval = {
  // the start slot, it's important to also specify the start slot, so we are
  // able to do the conversion slot <-> POSIXTime later
  validityIntervalStartSlot: number
  validityIntervalStart: Date // start slot as date
  ttl: Date // last slot as date
}

export type GenericInput =
  | {
      isScript: false
      utxo: UTxO // non-script input that is required by the scripts
    }
  | {
      isScript: true
      utxo: UTxO // script input that contain a datum if necessary
      redeemer: Omit<TxSpendRedeemer, 'ref'> // the reference is autofilled
      script: TxScript
    }

export type GenericOutput = {
  address: Address
  coins: Lovelace
  tokenBundle: TokenBundle
  datum?: TxDatum

  /**
   * Mark this output as the change output.
   * The lovelace and token values are ignored for now.
   * WARNING: Do not use without planType set to STRICT
   */
  isChangePlaceholder?: boolean
}

export type MintScript = {
  tokenBundle: TokenBundle // ⚠️tokens with the same policyId
  script: TxScript
  redeemer: Omit<TxMintRedeemer, 'ref'> // the reference will be autofilled
}

export enum TxPlanType {
  LOOSE,
  STRICT,
}

export type CatalystVotingRegistrationData = {
  votingPubKey: string
  stakePubKey: HexString
  nonce: Number
  rewardDestinationAddress: {
    address: Address
    stakingPath: BIP32Path
  }
}

export type CatalystVotingSignature = HexString

export type TxMessage = string[]

export type TxPlanMetadata = {
  message?: TxMessage
  custom?: TxMetadata

  // catalyst voting
  // the signature needs to be generated using the wallet
  // and should only be set in the plan for estimations and testing
  votingData?: CatalystVotingRegistrationData
  votingSignature?: CatalystVotingSignature
}

export type TxPlanArgs = {
  planType?: TxPlanType
  planId: string
  inputs?: GenericInput[]
  collateralInputs?: UTxO[] // ada-only utxos
  outputs?: GenericOutput[]
  mint?: MintScript[]
  requiredSigners?: AddrKeyHash[]
  certificates?: TxCertificate[]
  withdrawals?: TxWithdrawal[]
  validityInterval?: ValidityInterval
  potentialCollaterals?: UTxO[]
  protocolParameters: ProtocolParameters
  metadata?: TxPlanMetadata
}

export type TxPlanDraft = {
  inputs: TxInput[]
  collateralInputs?: TxInput[]
  outputs: TxOutput[]
  certificates: TxCertificate[]
  withdrawals: TxWithdrawal[]
  mint?: TokenBundle
  scripts?: TxScript[]
  datums?: TxDatum[]
  redeemers?: TxRedeemer[]
  planId?: string
  requiredSigners?: AddrKeyHash[]
  protocolParameters: ProtocolParameters
  metadata?: TxPlanMetadata
}

export type TxPlanResult =
  | {
      success: true
      txPlan: TxPlan
    }
  | {
      success: false
      error: any
      estimatedFee: Lovelace
      deposit: Lovelace
      minimalLovelaceAmount: Lovelace
    }

export interface TxPlan {
  inputs: Array<TxInput>
  collateralInputs: Array<TxInput>
  outputs: Array<TxOutput>
  change: Array<TxOutput>
  certificates: Array<TxCertificate>
  deposit: Lovelace
  additionalLovelaceAmount: Lovelace
  fee: Lovelace
  baseFee: Lovelace
  mint?: TokenBundle
  withdrawals: Array<TxWithdrawal>
  datums?: Array<TxDatum>
  scripts?: Array<TxScript>
  redeemers?: Array<TxRedeemer>
  planId?: string
  requiredSigners?: Array<AddrKeyHash>
  protocolParameters: ProtocolParameters
  metadata?: TxPlanMetadata

  // TODO replace prepareTxAux validity interval
  // with an interval from the plan
}
