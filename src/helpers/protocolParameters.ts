import {ProtocolParametersAlonzo, ProtocolParametersBabbage} from '@cardano-ogmios/schema'
import {ProtocolParameters} from '@/types/protocolParameters'
import {NonNullableObject} from './makeNonNullable'

export const isAlonzoProtocolParameters = (
  params: ProtocolParameters
): params is NonNullableObject<ProtocolParametersAlonzo> =>
  (params as NonNullableObject<ProtocolParametersAlonzo>).coinsPerUtxoWord !== undefined

export const isBabbageProtocolParameters = (
  params: ProtocolParameters
): params is NonNullableObject<ProtocolParametersBabbage> =>
  (params as NonNullableObject<ProtocolParametersBabbage>).coinsPerUtxoByte !== undefined
