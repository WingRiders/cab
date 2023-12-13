import {partition, some} from 'lodash'

import {isNonScriptUtxo} from '@/helpers'
import {isRecommendedCollateral, MAX_COLLATERAL_COUNT} from '@/helpers/collaterals'
import {addressToHex, isBase} from '@/ledger/address'
import {aggregateTokenBundles} from '@/ledger/assets'
import {Token, TokenBundle} from '@/types/base'
import {UTxO} from '@/types/transaction'
import {TxPlanArgs} from '@/types/txPlan'

export const sortUtxos = (utxos: UTxO[]) =>
  [...utxos].sort((a, b) =>
    a.txHash === b.txHash
      ? a.outputIndex - b.outputIndex
      : Buffer.from(a.txHash, 'hex').compare(Buffer.from(b.txHash, 'hex'))
  )

function isEqualUtxo(a: UTxO, b: UTxO) {
  return a.txHash === b.txHash && a.outputIndex === b.outputIndex
}

function splitPotentialCollaterals(utxos: UTxO[], maxCollateralCount = MAX_COLLATERAL_COUNT) {
  const [potentialCollaterals, spendable] = partition(utxos, isRecommendedCollateral)
  const sortedCollaterals = sortUtxos(potentialCollaterals)
  // take canonically the last X potential collaterals
  const collateralCount = Math.min(sortedCollaterals.length, maxCollateralCount)
  const splitMark = sortedCollaterals.length - collateralCount
  return [sortedCollaterals.slice(splitMark), spendable.concat(sortedCollaterals.slice(0, splitMark))]
}

/**
 *
 * @param utxos list of utxos to be used
 * @param txPlanArgs
 * @returns [arranged spendable utxos, potential collaterals]
 */
export function arrangeUtxos(utxos: UTxO[], txPlanArgs: TxPlanArgs): [UTxO[], UTxO[]] {
  // filter out utxos that are already defined in the plan
  const usedCollaterals = txPlanArgs.collateralInputs || []
  const inputUtxos = [...(txPlanArgs.inputs || []).map(({utxo}) => utxo), ...usedCollaterals]
  const unusedUtxos = utxos.filter((utxo) => !inputUtxos.find((input) => isEqualUtxo(utxo, input)))

  // sort collaterals to the end, if the txPlan already contains some potential collaterals
  // don't try to find potential utxos that might fit
  const [collateralUtxos, spendableUtxos] =
    txPlanArgs.potentialCollaterals && txPlanArgs.potentialCollaterals.length > 0
      ? [
          txPlanArgs.potentialCollaterals,
          // just in case remove these utxos from the start
          unusedUtxos.filter(
            (utxo) =>
              !some(txPlanArgs.potentialCollaterals, (collateral) => isEqualUtxo(utxo, collateral))
          ),
        ]
      : splitPotentialCollaterals(unusedUtxos, MAX_COLLATERAL_COUNT - usedCollaterals.length)

  // canonically sort, collateralUtxos are already sorted
  const sortedUtxos = sortUtxos(spendableUtxos)
  const [nonScriptUtxos, scriptUtxos] = partition(sortedUtxos, isNonScriptUtxo)

  const nonStakingUtxos = nonScriptUtxos.filter(({address}) => !isBase(addressToHex(address)))
  const baseAddressUtxos = nonScriptUtxos.filter(({address}) => isBase(addressToHex(address)))
  const adaOnlyUtxos = baseAddressUtxos.filter(({tokenBundle}) => tokenBundle.length === 0)
  // we want to discourage using UTxOs that could be used as collaterals
  // TODO the plan should include a flag if it wants to allow using collateral UTxOs
  const tokenUtxos = baseAddressUtxos.filter(({tokenBundle}) => tokenBundle.length > 0)

  const invSelectTokens = ({tokenBundle}: {tokenBundle: TokenBundle}) =>
    tokenBundle.map((token) => ({...token, quantity: token.quantity.negated()}))

  const outputTokens = (txPlanArgs.outputs || []).map((output) => output.tokenBundle)
  const invMintedTokens = (txPlanArgs.mint || []).map(invSelectTokens)
  const inputTokens = (txPlanArgs.inputs || []).map(({utxo}) => utxo).map(invSelectTokens)
  // tokens that need to be provided by the wallet, but were not listed already
  // as part of the required utxos
  // findTokens = output - minted - input
  // e.g. tokens can also be burned as a requirement -(-T) = T required
  const txBundle = aggregateTokenBundles([...outputTokens, ...invMintedTokens, ...inputTokens])
  const includesToken = (token: Token) =>
    txBundle.some(
      ({policyId, assetName}) => token.policyId === policyId && token.assetName === assetName
    )

  const [targetTokenUtxos, nonTargetTokenUtxos] = partition(tokenUtxos, ({tokenBundle}) =>
    tokenBundle.some((token) => includesToken(token))
  )
  return [
    [...targetTokenUtxos, ...nonStakingUtxos, ...adaOnlyUtxos, ...nonTargetTokenUtxos, ...scriptUtxos],
    collateralUtxos,
  ]
}
