import {HexString, Lovelace, Token, TokenBundle} from './base'
import {ProtocolParameters} from './protocolParameters'
import {HostedPoolMetadata, NextRewardDetail, StakePoolInfoExtended} from './stakepool'
import {UTxO} from './transaction'

/**
 * TODO clean up these types
 */

export type BestSlotResponse = {
  Right: {
    bestSlot: number
    bestTime: string
    bestNodeSlot?: number
  }
}

export type TokenObject = Omit<Token, 'quantity'> & {
  quantity: string // possibly huge amounts
}

export type CoinObject = {
  getCoin: string
  getTokens: TokenObject[]
}

export type AddressCoinTuple = [string, CoinObject]

export type CaTxEntry = {
  ctbId: string
  ctbTimeIssued: number
  ctbInputs: Array<AddressCoinTuple>
  ctbOutputs: Array<AddressCoinTuple>
  ctbInputSum: CoinObject
  ctbOutputSum: CoinObject
  fee: string
  isValid: boolean
  scriptSize: number
}

export type TxSummaryEntry = Omit<CaTxEntry, 'fee'> & {
  fee: Lovelace
  effect: Lovelace
  tokenEffects: TokenBundle
}

export type TxSummary = {
  ctsId: string
  ctsTxTimeIssued: number
  ctsBlockTimeIssued: number
  ctsBlockHeight: number
  ctsBlockEpoch: number
  ctsBlockSlot: number
  ctsBlockHash: string
  ctsRelayedBy: null
  ctsTotalInput: CoinObject
  ctsTotalOutput: CoinObject
  ctsFees: CoinObject
  ctsInputs: Array<AddressCoinTuple>
  ctsOutputs: Array<AddressCoinTuple>
}

// similar to TxSummary, mainly for checking tx existence
export type TxBlockInfo = {
  txHash: string
  creationTime: string
  blockHeight: number
  blockEpoch: number
  blockSlot: number
  blockHash: string
}

export enum PoolRecommendationStatus {
  INVALID = 'GivenPoolInvalid',
  SATURATED = 'GivenPoolSaturated',
  BEYOND_OPTIMUM = 'GivenPoolBeyondOptimum',
  OK = 'GivenPoolOk',
  UNDER_MINIMUM = 'GivenPoolUnderMinimum',
}

export type PoolRecommendationResponse = StakePoolInfoExtended & {
  status: PoolRecommendationStatus
  recommendedPoolHash: string
  isInRecommendedPoolSet: boolean
  isInPrivatePoolSet: boolean
  isRecommendationPrivate: boolean
}

export type StakingInfoResponse = {
  currentEpoch: number
  delegation: StakePoolInfoExtended & {
    retiringEpoch: number | null
    url: string
  }
  hasStakingKey: boolean
  rewards: string
  nextRewardDetails: Array<NextRewardDetail>
}

export type BulkAddressesSummary = {
  caAddresses: Array<string>
  caTxNum: number
  caBalance: CoinObject
  caTxList: Array<CaTxEntry>
}

export type BulkAddressesUsed = Array<{
  address: string
  isUsed: boolean
}>

export type FailureResponse = {Left: string}
export type SuccessResponse<T> = {
  Right: T
}

export type TxSummaryResponse = SuccessResponse<TxSummary> | FailureResponse
export type BulkAddressesSummaryResponse = SuccessResponse<BulkAddressesSummary> | FailureResponse

export type TxSubmission = {txHash: string}
export type TxSubmissionFailure = FailureResponse & {
  statusCode?: number
}
export type SubmitResponse = SuccessResponse<TxSubmission> | TxSubmissionFailure
export type UTxOResponse = {
  id: number
  tag: string
  cuId: string
  cuOutIndex: number
  cuAddress: string
  cuCoins: CoinObject
  cuDatumValue?: string
  cuDatumHash?: string
  creationTime?: string
  hasInlineScript?: boolean
}
export type BulkAdressesUtxoResponse = SuccessResponse<Array<UTxOResponse>> | TxSubmissionFailure

export interface IBlockchainExplorer {
  fetchUnspentTxOutputs(addresses: Array<string>): Promise<UTxO[]>
  isSomeAddressUsed(addresses: Array<string>): Promise<boolean>
  submitTxRaw(txHash, txBody, params): Promise<TxSubmission>
  fetchTxBlockInfo(txHash: string): Promise<TxBlockInfo | null>
  filterUsedAddresses(addresses: Array<string>): Promise<Set<string>>
  getPoolInfo(url: string): Promise<HostedPoolMetadata | null>
  getStakingInfo(stakingKeyHashHex: HexString): Promise<StakingInfoResponse>
  getBestSlot(): Promise<BestSlotResponse>
  getProtocolParameters(): Promise<ProtocolParameters>
}
