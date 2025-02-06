import {ProtocolParameters as OgmiosProtocolParameters} from '@cardano-ogmios/schema'
import {SetRequired} from 'type-fest'

import {NonNullableObject} from '@/helpers'

/**
 * borrowed from ogmis client
 */
export interface ExUnits {
  memory: UInt64
  steps: UInt64
}

type Null = null
type NullableUInt64 = UInt64 | Null
type NullableRatio = Ratio | Null

interface ProtocolVersion {
  major: UInt32
  minor: UInt32
  patch?: UInt32
}

type Ratio = string
type UInt32 = number
type UInt64 = number

interface CostModels {
  [k: string]: CostModel
}

// Assumes the order from Ogmios is the same as when encoding script_data_hash
// https://github.com/IntersectMBO/cardano-ledger/blob/master/eras/conway/impl/cddl-files/conway.cddl#L412-L414
// ;     Note that each Plutus language represented inside a transaction must have
// ;     a cost model in the costmdls protocol parameter in order to execute,
// ;     regardless of what the script integrity data is.
type CostModel = number[]

export interface Prices {
  memory: Ratio
  steps: Ratio
}

export type MinFeeReferenceScripts = {
  range: UInt32
  base: number
  multiplier: number
}

export interface ProtocolParametersBabbage {
  minFeeCoefficient: NullableUInt64
  minFeeConstant: NullableUInt64
  maxBlockBodySize: NullableUInt64
  maxBlockHeaderSize: NullableUInt64
  maxTxSize: NullableUInt64
  stakeKeyDeposit: NullableUInt64
  poolDeposit: NullableUInt64
  poolRetirementEpochBound: NullableUInt64
  desiredNumberOfPools: NullableUInt64
  poolInfluence: NullableRatio
  monetaryExpansion: NullableRatio
  treasuryExpansion: NullableRatio
  minPoolCost: NullableUInt64
  coinsPerUtxoByte: NullableUInt64
  maxValueSize: NullableUInt64
  collateralPercentage: NullableUInt64
  maxCollateralInputs: NullableUInt64
  protocolVersion: ProtocolVersion | Null
  costModels: CostModels | Null
  prices: Prices | Null
  maxExecutionUnitsPerTransaction: ExUnits | Null
  maxExecutionUnitsPerBlock: ExUnits | Null
}

export type ProtocolParametersConwayAdditions = {
  maxReferenceScriptsSize: NullableUInt64
  minFeeReferenceScripts: MinFeeReferenceScripts | Null
}

export const conwayAdditions: (keyof ProtocolParametersConwayAdditions)[] = [
  'maxReferenceScriptsSize',
  'minFeeReferenceScripts',
]

export type ProtocolParametersConway = ProtocolParametersBabbage & ProtocolParametersConwayAdditions

export type NullableProtocolParameters = ProtocolParametersConway

export type OldProtocolParameters = NonNullableObject<ProtocolParametersBabbage> &
  ProtocolParametersConwayAdditions

export const requiredProtocolParameterFields = [
  'plutusCostModels',
  'maxExecutionUnitsPerTransaction',
  'collateralPercentage',
  'maxCollateralInputs',
  'maxTransactionSize',
  // Following fields are already required in Ogmios type, but we want to null-check them:
  'minFeeCoefficient',
  'minFeeConstant',
  'maxBlockBodySize',
  'maxBlockHeaderSize',
  'stakeCredentialDeposit',
  'stakePoolDeposit',
  'stakePoolRetirementEpochBound',
  'desiredNumberOfStakePools',
  'stakePoolPledgeInfluence',
  'monetaryExpansion',
  'treasuryExpansion',
  'minStakePoolCost',
  'minUtxoDepositConstant',
  'minUtxoDepositCoefficient',
  'maxValueSize',
  'version',
  'scriptExecutionPrices',
  'maxExecutionUnitsPerBlock',
  'maxReferenceScriptsSize',
  'minFeeReferenceScripts',
] as const

export type ConvertBigIntsToNumbers<T> = {
  [K in keyof T]: T[K] extends bigint
    ? number
    : T[K] extends object
    ? ConvertBigIntsToNumbers<T[K]>
    : T[K]
}

export type RequiredOgmiosProtocolParameters = SetRequired<
  OgmiosProtocolParameters,
  (typeof requiredProtocolParameterFields)[number]
>

export type ProtocolParameters = ConvertBigIntsToNumbers<RequiredOgmiosProtocolParameters>
