// policyId is 28 bytes, assetName max 32 bytes, together with quantity makes
import {adaToLovelace} from '../../helpers/adaConverters'

// max token size about 70 bytes, max output size is 4000 => 4000 / 70 ~ 50
export const MAX_OUTPUT_TOKENS = 50

export const MIN_UTXO_VALUE = adaToLovelace(1)

export const POLICY_ID_SIZE = 28 // bytes

export const DATA_HASH_SIZE_IN_WORDS = 10

export const METADATA_HASH_BYTE_LENGTH = 32
export const INTEGRITY_HASH_BYTE_LENGTH = 32

export const TX_WITNESS_SIZES = {
  /**
   * [ $vkey, $signature ]
   * $vkey /= bytes .size 32
   * $signature /= bytes .size 64
   */
  shelley: 139, //TODO: this is too much
}
