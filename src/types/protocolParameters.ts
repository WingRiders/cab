import {NonNullableObject} from '@/helpers/makeNonNullable'

/**
 * borrowed from ogmis client
 */
export interface ExUnits {
  memory: UInt64
  steps: UInt64
}
type Int64 = number
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
type CostModel = Int64[]
export interface Prices {
  memory: Ratio
  steps: Ratio
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

export type NullableProtocolParameters = ProtocolParametersBabbage

export type ProtocolParameters = NonNullableObject<NullableProtocolParameters>
