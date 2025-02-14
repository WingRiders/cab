import {ProtocolParameters as OgmiosProtocolParameters} from '@cardano-ogmios/schema'
import {SetRequired} from 'type-fest'

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
