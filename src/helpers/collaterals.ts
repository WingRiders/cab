import {isNonScriptUtxo} from '@/helpers/isNonScriptUtxo'
import {hasSpendingScript} from '@/ledger/address'
import {UTxO} from '@/types/transaction'

/**
 * The theoretical maximum collateral amount that would be needed currently
 * ```
 *   max_fee = (max_mem_units * memory_price) + (max_step_units * steps_price) +
 *             (max_tx_size * fee_per_byte) + base_fee
 * ```
 * The collateral needs to be 150% of the fee
 * max_collateral > max_fee * 1.5
 */
export const MAX_COLLATERAL_AMOUNT = 5_000_000
export const MIN_RECOMMENDED_COLLATERAL_AMOUNT = 3_000_000
export const MAX_COLLATERAL_COUNT = 3

export const isAdaOnlyUtxo = (utxo: UTxO) => utxo.tokenBundle.length === 0 && !utxo.datum

export const isPotentialCollateral = (utxo: UTxO) =>
  utxo.coins.lte(MAX_COLLATERAL_AMOUNT) &&
  isAdaOnlyUtxo(utxo) &&
  !hasSpendingScript(utxo.address) &&
  isNonScriptUtxo(utxo)

export const isRecommendedCollateral = (utxo: UTxO) =>
  isPotentialCollateral(utxo) && utxo.coins.gte(MIN_RECOMMENDED_COLLATERAL_AMOUNT)
