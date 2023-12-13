import {AddrKeyHash, BIP32Path, ScriptHash} from './address'
import {Address, HexString, Lovelace, TokenBundle} from './base'
import {ProtocolParameters} from './protocolParameters'
import {
  ReferenceScript,
  TxCertificate,
  TxDatum,
  TxInput,
  TxInputRef,
  TxMetadata,
  TxMetadatum,
  TxMintRedeemer,
  TxOutput,
  TxRedeemer,
  TxScript,
  TxScriptSource,
  TxSpendRedeemer,
  TxWithdrawal,
  UTxO,
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
      isReferenceScript?: false
      utxo: UTxO // script input that contain a datum if necessary
      redeemer: Omit<TxSpendRedeemer, 'ref'> // the reference is autofilled
      script: TxScript
    }
  | {
      isScript: true
      isReferenceScript: true
      utxo: UTxO
      redeemer: Omit<TxSpendRedeemer, 'ref'> // the reference is autofilled
      scriptHash: ScriptHash
    }

export type ReferenceInput = TxInputRef & {datum?: TxDatum}

export type GenericOutput = {
  address: Address
  coins: Lovelace
  tokenBundle: TokenBundle
  datum?: TxDatum

  // introduced with babbage & Plutus v2
  inlineDatum?: boolean
  inlineScript?: TxScript

  /**
   * Mark this output as the change output.
   * The lovelace and token values are ignored for now.
   * WARNING: Do not use without planType set to STRICT
   */
  isChangePlaceholder?: boolean
}

export type MintScript = {
  tokenBundle: TokenBundle // ⚠️tokens with the same policyId
  redeemer: Omit<TxMintRedeemer, 'ref'> // the reference will be autofilled
  script: TxScriptSource
}

export enum TxPlanType {
  LOOSE,
  STRICT,
  // babbage versions that support reference inputs
  // and collateral output
  LOOSE_BABBAGE,
  STRICT_BABBAGE,
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

// https://cips.cardano.org/cips/cip25/
export type TxNftMetadatum = {
  policyId: HexString
  assetName: HexString
  name: string
  image: string
  description?: string
  mediaType?: string
  files?: Array<{
    name: string
    mediaType: string
    src: string
  }>
  // these props will be unwrapped alongside the props above
  otherProperties?: Map<string, TxMetadatum>
}

export type TxPlanMetadata = {
  message?: TxMessage
  custom?: TxMetadata
  nfts?: {
    version: number // 1 | 2
    data: TxNftMetadatum[]
  }

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
  // referenceInputs for reference scripts and mint reference scripts will be autofilled
  referenceInputs?: ReferenceInput[]
  referenceScripts?: ReferenceScript[]
  outputs?: GenericOutput[]
  mint?: MintScript[]
  requiredSigners?: AddrKeyHash[]
  certificates?: TxCertificate[]
  withdrawals?: TxWithdrawal[]
  validityInterval?: ValidityInterval
  protocolParameters: ProtocolParameters
  metadata?: TxPlanMetadata

  // collaterls
  potentialCollaterals?: UTxO[]
  collateralInputs?: UTxO[] // ada-only utxos
  // the collateral coins and token amounts will be automatically calculated
  // if not set an output will be created to the change address
  collateralOutput?: GenericOutput
}

export type TxPlanDraft = {
  inputs: TxInput[]
  referenceInputs?: TxInputRef[]
  collateralInputs?: TxInput[]
  collateralOutput?: TxOutput
  outputs: TxOutput[]
  certificates: TxCertificate[]
  withdrawals: TxWithdrawal[]
  mint?: TokenBundle
  scripts?: TxScriptSource[]
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
  referenceInputs?: Array<TxInputRef>

  outputs: Array<TxOutput>
  change: Array<TxOutput>
  additionalLovelaceAmount: Lovelace

  fee: Lovelace
  baseFee: Lovelace

  collateralInputs: Array<TxInput>
  collateralOutput?: TxOutput // optional output for collaterals
  totalCollateral?: Lovelace // the collateral amount

  requiredSigners?: Array<AddrKeyHash>
  mint?: TokenBundle

  datums?: Array<TxDatum>
  scripts?: Array<TxScriptSource>
  redeemers?: Array<TxRedeemer>

  certificates: Array<TxCertificate>
  deposit: Lovelace
  withdrawals: Array<TxWithdrawal>
  planId?: string

  protocolParameters: ProtocolParameters
  metadata?: TxPlanMetadata

  // TODO replace prepareTxAux validity interval
  // with an interval from the plan
}
