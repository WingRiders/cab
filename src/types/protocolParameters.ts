import {ProtocolParametersAlonzo, ProtocolParametersBabbage} from '@cardano-ogmios/schema'
import {NonNullableObject} from '@/helpers/makeNonNullable'

export type NullableProtocolParameters = ProtocolParametersAlonzo | ProtocolParametersBabbage

export type ProtocolParameters = NonNullableObject<NullableProtocolParameters>
