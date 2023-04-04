import {Lovelace} from './base'

type SingleHostIPRelay = {
  type: TxRelayType.SINGLE_HOST_IP
  params: {
    portNumber?: number
    ipv4?: string
    ipv6?: string
  }
}

type SingleHostNameRelay = {
  type: TxRelayType.SINGLE_HOST_NAME
  params: {
    portNumber?: number
    dnsName: string
  }
}

type MultiHostNameRelay = {
  type: TxRelayType.MULTI_HOST_NAME
  params: {
    dnsName: string
  }
}

type TxStakepoolMetadata = {
  metadataUrl: string
  metadataHashHex: string
}

export type TxStakepoolMargin = {
  numeratorStr: string
  denominatorStr: string
}

export type TxPoolParams = {
  poolKeyHashHex: string // Hex
  vrfKeyHashHex: string
  pledgeStr: string
  costStr: string
  margin: TxStakepoolMargin
  rewardAccountHex: string
  poolOwners: TxStakepoolOwner[]
  relays: TxStakepoolRelay[]
  metadata: TxStakepoolMetadata | null
}

export const enum TxRelayType {
  SINGLE_HOST_IP = 0,
  SINGLE_HOST_NAME = 1,
  MULTI_HOST_NAME = 2,
}

export type TxStakepoolOwner = {
  stakingKeyHashHex?: string
}

export type TxStakepoolRelay = SingleHostIPRelay | SingleHostNameRelay | MultiHostNameRelay

export type Stakepool = {
  pledge: string
  margin: number
  fixedCost: string
  url: string
  name: string
  ticker: string
  homepage: string
  poolHash: string
}

export type StakePoolInfo = {
  pledge: string
  margin: number
  fixedCost: string
  name: string
  ticker: string
  homepage: string
}

export type HostedPoolMetadata = {
  name: string
  description: string
  ticker: string
  homepage: string
  extended?: string
}

export type StakePoolInfosByPoolHash = {[key: string]: StakePoolInfo}

export type StakePoolInfoExtended = StakePoolInfo & {
  poolHash: string
  liveStake: string
  roa: string
  epochBlocks: string
  lifeTimeBlocks: string
  saturatedPercentage: number
}

export type PoolRecommendation = {
  isInRecommendedPoolSet: boolean
  isInPrivatePoolSet: boolean
  isRecommendationPrivate: boolean
  recommendedPoolHash: string
  status: string
  shouldShowSaturatedBanner: boolean
}

export type DelegationHistoryEntry = StakePoolInfoExtended & {
  txHash: string
  time: string
  epochNo: number
}

export enum RewardType {
  REGULAR = 'REGULAR',
  ITN = 'ITN',
  TREASURY = 'TREASURY',
}

export type RewardsHistoryEntry = StakePoolInfoExtended & {
  time: string
  epochNo: number
  forDelegationInEpoch: number
  amount: string
  rewardType: RewardType
}

export type WithdrawalsHistoryEntry = {
  time: string
  epochNo: number
  txHash: string
  amount: string
}

export type StakeRegistrationHistoryEntry = {
  txHash: string
  time: string
  epochNo: number
  action: 'registration' | 'deregistration'
}

export type NextRewardDetail = StakePoolInfoExtended & {
  forEpoch: number
  rewardDate: string
}

export type RewardWithMetadata = NextRewardDetail & {
  distributionEpoch?: number
  pool: HostedPoolMetadata | Object // TODO after refactor
}

export type NextRewardDetailsFormatted = {
  upcoming: Array<RewardWithMetadata>
  nearest: RewardWithMetadata
  currentDelegation: RewardWithMetadata | undefined
}

export interface StakingHistoryStakePool {
  id: string
  name: string
}

export enum StakingHistoryItemType {
  STAKE_DELEGATION,
  STAKING_REWARD,
  REWARD_WITHDRAWAL,
  STAKING_KEY_REGISTRATION,
  STAKING_KEY_DEREGISTRATION,
}

export interface StakingHistoryItem {
  type: StakingHistoryItemType
  epoch: number
  dateTime: Date
}

export interface StakeDelegation extends StakingHistoryItem {
  newStakePool: StakingHistoryStakePool
  oldStakePool?: StakingHistoryStakePool
  txHash: string
}

export interface StakingReward extends StakingHistoryItem {
  forEpoch: number
  reward: Lovelace
  stakePool: StakingHistoryStakePool
  rewardType: RewardType
}

export interface RewardWithdrawal extends StakingHistoryItem {
  amount: Lovelace
  txHash: string
}
export interface StakingKeyRegistration extends StakingHistoryItem {
  action: string
  stakingKey: string
  txHash: string
}
