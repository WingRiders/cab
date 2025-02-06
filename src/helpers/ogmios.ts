import {ProtocolParameters as OgmiosProtocolParameters} from '@cardano-ogmios/schema'

import {
  ProtocolParameters,
  RequiredOgmiosProtocolParameters,
  requiredProtocolParameterFields,
} from '@/types'

const validateOgmiosProtocolParameters: (
  params: OgmiosProtocolParameters
) => asserts params is RequiredOgmiosProtocolParameters = (params) => {
  for (const field of requiredProtocolParameterFields) {
    if (params[field] == null) {
      throw new Error(`Missing required field: ${field}`)
    }
  }
}

export const parseOgmiosProtocolParameters = (params: OgmiosProtocolParameters): ProtocolParameters => {
  validateOgmiosProtocolParameters(params)
  return {
    ...params,
    minFeeConstant: {ada: {lovelace: Number(params.minFeeConstant.ada.lovelace)}},
    minUtxoDepositConstant: {ada: {lovelace: Number(params.minUtxoDepositConstant.ada.lovelace)}},
    stakeCredentialDeposit: {ada: {lovelace: Number(params.stakeCredentialDeposit.ada.lovelace)}},
    stakePoolDeposit: {ada: {lovelace: Number(params.stakePoolDeposit.ada.lovelace)}},
    minStakePoolCost: {ada: {lovelace: Number(params.minStakePoolCost.ada.lovelace)}},
  }
}
