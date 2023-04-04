import {Lovelace, ZeroLovelace} from '@/types/base'
import {TxCertificateType, TxInput, TxOutput} from '@/types/transaction'
import {TxPlan, TxPlanDraft, TxPlanResult} from '@/types/txPlan'
import {CabInternalError, CabInternalErrorReason, UnexpectedErrorReason} from '@/errors'
import {aggregateTokenBundles, getTokenBundlesDifference} from '@/ledger/assets/tokenFormatter'
import {removeNullFields} from '@/helpers/removeNullFields'
import {cborizeSingleTxOutput} from './cbor/cborize'
import {
  computeAdditionalCollateralFee,
  computeMinUTxOLovelaceAmount,
  computeRequiredDeposit,
  computeRequiredTxFee,
  createTokenChangeOutputs,
} from './utils'
import {encode} from 'borc'
import {MAX_OUTPUT_TOKENS, MIN_UTXO_VALUE} from './txConstants'
import {MAX_INT64} from '@/constants'
import {estimateTxSize} from './estimateSize'
import {removeEmptyArray} from '@/helpers/removeEmptyArray'
import {sumCoins} from '@/helpers'
import {UnexpectedErrorSubCode} from '@/errors/unexpectedErrorReason'

type ComputeTxPlanParams = TxPlanDraft & {
  availableCollateralInputs: TxInput[]
  possibleChange: TxOutput
}

type ComputeStrictTxPlanParams = TxPlanDraft & {
  possibleChange: TxOutput
}

/*
  computing tx plan happens in multiple stages, first we calculate sums of inputs, outputs and
  tokenDifference, then we validate the basic condition for creating the plan, that the inputs
  are big enough to pay for the outputs, then some of the edge cases are handled, perfect fit
  and adding change to fee since it too small

  if conditions for these cases are not met, its sure the resulting tx will contain a change output
  change is either only in ada, or it contains also some tokens

  if change is only in ada, it can be added to the fee in case its too small, or is given a
  separate change output,

  if change also includes tokens, we first of all split these token into outputs so they dont
  exceed max utxo size, note that these token change outputs have minAda value which has to be
  payed for by provided inputs
  we calculate remaining change which can be of two types, its either big enough for separate
  adaOnly change output or its not and we add it to the first token change output
*/

const feeToRequiredCollateral = (fee: Lovelace, collateralPercentage: number) =>
  fee.multipliedBy(collateralPercentage).dividedBy(100).integerValue(Lovelace.ROUND_UP) as Lovelace

const sumRewards = (txos: {rewards: Lovelace}[]) =>
  txos.reduce((acc, {rewards}) => acc.plus(rewards), new Lovelace(0)) as Lovelace

/**
 * The current plan can already contain some collaterals which this function leaves in place,
 * These might've come from the user or previous calculation. The caller should reset the collaterals
 * if doesn't want to reuse previously calculated collaterals.
 * We might need to add additional collaterals or if the user haven't defined
 * any collaterals, we add some extra.
 * @param txPlan the current plan that potentially contains some collaterals
 * @param availableCollaterInputs all collaterals that are in the account
 * @returns
 */
export function addCollateralsIfNeeded(
  txPlan: TxPlan,
  availableCollaterInputs: TxInput[]
): {error: string | null; txPlan: TxPlan} {
  if (!txPlan.scripts || txPlan.scripts.length === 0) {
    // only scripts need collaterals
    return {error: null, txPlan}
  }

  const pparams = txPlan.protocolParameters
  const collateralPercentage = pparams.collateralPercentage
  const currentCollateralSum = sumCoins(txPlan.collateralInputs)
  const baseFee = computeRequiredTxFee(txPlan)

  const currentCollateralNeeded = feeToRequiredCollateral(baseFee, collateralPercentage)

  if (currentCollateralSum.gt(currentCollateralNeeded)) {
    return {error: null, txPlan}
  } else if (availableCollaterInputs.length === 0) {
    return {
      error: 'collaterals required',
      txPlan,
    }
  }

  // We are trying to find the smallest collateral that fits our requirements
  const collaterals = [...availableCollaterInputs].sort((a, b) => a.coins.comparedTo(b.coins))

  let collateralValueNeeded: Lovelace

  if (txPlan.collateralInputs.length === 0) {
    const feeWithoutCollateral = computeRequiredTxFee({...txPlan, collateralInputs: []})
    const singleCollateralValueNeeded = feeToRequiredCollateral(
      feeWithoutCollateral.plus(computeAdditionalCollateralFee(pparams, true)) as Lovelace,
      collateralPercentage
    )

    // smallest collateral that would be enough
    const singleCollateral = collaterals.find(({coins}) => coins.gt(singleCollateralValueNeeded))
    if (singleCollateral) {
      const draft = {
        ...txPlan,
        collateralInputs: [singleCollateral],
      }
      return {
        error: null,
        txPlan: draft,
      }
    } else {
      // we didn't find any good candidate, we will need to add to the txplan
      collateralValueNeeded = singleCollateralValueNeeded
    }
  } else {
    // else we need to fill up to the difference
    collateralValueNeeded = currentCollateralNeeded.minus(currentCollateralSum) as Lovelace
  }

  /**
   * we should find the best fit of collaterals optimizing the minimum number of collaterals
   * and secondarily not going too much over the limit
   * TODO optimize also around the amount, not just add the X largest ones that fit our requirements
   */
  const additionalCollateralPenalty = feeToRequiredCollateral(
    computeAdditionalCollateralFee(pparams, false),
    collateralPercentage
  )

  const usedCollaterals = [...txPlan.collateralInputs]
  let collateralAvailable = ZeroLovelace

  // go from largest to smallest, since there is a limit to the number of collaterals
  // and at this point we are trying to use as few collaterals as posssible
  collaterals.reverse()
  for (const collateral of collaterals) {
    collateralAvailable = collateralAvailable.plus(collateral.coins) as Lovelace
    usedCollaterals.push(collateral)
    collateralValueNeeded = collateralValueNeeded.plus(additionalCollateralPenalty) as Lovelace

    if (collateralAvailable.gt(collateralValueNeeded)) {
      return {
        error: null,
        txPlan: {...txPlan, collateralInputs: usedCollaterals},
      }
    }

    if (collaterals.length > pparams.maxCollateralInputs) {
      return {
        error: 'too many collaterals needed',
        txPlan,
      }
    }
  }

  return {
    error: 'not enough collateral',
    txPlan,
  }
}

export function computeTxPlan({
  inputs,
  collateralInputs = [],
  availableCollateralInputs,
  outputs,
  possibleChange,
  certificates,
  withdrawals,
  datums,
  scripts,
  redeemers,
  mint = [],
  planId,
  requiredSigners = [],
  protocolParameters,
  metadata,
}: ComputeTxPlanParams): TxPlanResult {
  const totalRewards = sumRewards(withdrawals)
  const totalInput = sumCoins(inputs).plus(totalRewards)
  const totalInputTokens = aggregateTokenBundles([...inputs.map(({tokenBundle}) => tokenBundle), mint])
  const deposit = computeRequiredDeposit(certificates, protocolParameters)
  const totalOutput = sumCoins(outputs).plus(deposit)
  const totalOutputTokens = aggregateTokenBundles(outputs.map(({tokenBundle}) => tokenBundle))

  // total amount of lovelace that had to be added to token-containing outputs
  const additionalLovelaceAmount = outputs.reduce(
    (acc, {coins, tokenBundle}) => (tokenBundle.length > 0 ? acc.plus(coins) : acc),
    new Lovelace(0)
  ) as Lovelace

  const optionalFields = removeNullFields({
    datums,
    scripts,
    redeemers,
    mint: mint.length > 0 ? mint : undefined,
    planId,
    requiredSigners: requiredSigners.length > 0 ? requiredSigners : undefined,
    metadata,
  })

  const draftWithoutExtraCollaterals: TxPlan = {
    inputs,
    collateralInputs,
    outputs,
    change: [],
    certificates,
    deposit,
    withdrawals,
    additionalLovelaceAmount,
    baseFee: ZeroLovelace,
    fee: ZeroLovelace,
    protocolParameters,
    ...optionalFields,
  }

  const {error: baseCollateralError, txPlan: draft} = addCollateralsIfNeeded(
    draftWithoutExtraCollaterals,
    availableCollateralInputs
  )

  if (baseCollateralError) {
    return {
      success: false,
      minimalLovelaceAmount: additionalLovelaceAmount,
      estimatedFee: ZeroLovelace,
      deposit,
      error: {code: UnexpectedErrorReason.CannotConstructTxPlan, reason: baseCollateralError},
    }
  }

  const feeWithoutChange = computeRequiredTxFee(draft)

  const tokenDifference = getTokenBundlesDifference(totalInputTokens, totalOutputTokens)

  const isTokenDifferenceEmpty =
    tokenDifference.length === 0 || tokenDifference.every(({quantity}) => quantity.isZero())

  const insufficientTokens = tokenDifference.filter(({quantity}) => quantity.isNegative())
  // Cannot construct transaction plan, not enough tokens
  if (insufficientTokens.length > 0) {
    const insufficientTokensReadable = insufficientTokens
      .map(({assetName, quantity}) => `${Buffer.from(assetName, 'hex').toString('utf8')}: ${quantity}`)
      .join(', ')
    return {
      success: false,
      minimalLovelaceAmount: additionalLovelaceAmount,
      estimatedFee: feeWithoutChange,
      deposit,
      error: {
        code: UnexpectedErrorReason.CannotConstructTxPlan,
        reason: `Not enough tokens: ${insufficientTokensReadable}`,
      },
    }
  }

  const remainingNoChangeLovelace = totalInput.minus(totalOutput).minus(feeWithoutChange)

  // Cannot construct transaction plan, not enough lovelace
  if (inputs.length === 0 || remainingNoChangeLovelace.isNegative()) {
    return {
      success: false,
      minimalLovelaceAmount: additionalLovelaceAmount,
      estimatedFee: feeWithoutChange,
      deposit,
      error: {
        code: UnexpectedErrorReason.CannotConstructTxPlan,
        subCode: UnexpectedErrorSubCode.InsufficientAda,
        reason: 'Not enough balance',
        message: `${remainingNoChangeLovelace} = ${totalInput} - ${totalOutput} - ${feeWithoutChange}`,
      },
    }
  }

  // No change necessary, perfect fit
  if (isTokenDifferenceEmpty && remainingNoChangeLovelace.isZero()) {
    return {
      success: true,
      txPlan: {
        ...draft,
        fee: feeWithoutChange,
        baseFee: feeWithoutChange,
      },
    }
  }

  // From this point on we are sure its not a perfect fit
  // although totalOutput < totalInput so change has to be calculated

  const adaOnlyChangeOutput: TxOutput = {
    isChange: true,
    address: possibleChange.address,
    coins: ZeroLovelace,
    tokenBundle: [],
  }

  const {error: changeCollateralError, txPlan: draftWithChange} = addCollateralsIfNeeded(
    {
      ...draft,
      collateralInputs, // reset collaterals
      outputs: [...draft.outputs, adaOnlyChangeOutput],
    },
    availableCollateralInputs
  )

  const collateralPercentage = protocolParameters.collateralPercentage
  const feeWithAdaOnlyChange = computeRequiredTxFee(draftWithChange)

  const remainingAdaOnlyChangeLovelace = totalInput
    .minus(totalOutput)
    .minus(feeWithAdaOnlyChange) as Lovelace
  const collateralAvailableWithoutChange = sumCoins(draft.collateralInputs)
  const collateralRequiredWithoutChange =
    draft.collateralInputs.length === 0
      ? 0
      : feeToRequiredCollateral(totalInput.minus(totalOutput) as Lovelace, collateralPercentage)

  // We cannot create a change output with minimal ada so we add it to the fee
  if (
    isTokenDifferenceEmpty &&
    remainingAdaOnlyChangeLovelace.lt(MIN_UTXO_VALUE) &&
    collateralAvailableWithoutChange.gte(collateralRequiredWithoutChange)
  ) {
    return {
      success: true,
      txPlan: {
        ...draft,
        fee: totalInput.minus(totalOutput) as Lovelace,
        baseFee: feeWithoutChange,
      },
    }
  } else if (changeCollateralError) {
    // there is not enough collateral to cover a change output
    return {
      success: false,
      minimalLovelaceAmount: additionalLovelaceAmount,
      estimatedFee: feeWithAdaOnlyChange,
      deposit,
      error: {code: UnexpectedErrorReason.CannotConstructTxPlan, reason: changeCollateralError},
    }
  }

  // From this point on change has to be included in transaction for it to be balanced

  // if tokenDifference is empty, we create one ada only change output
  if (isTokenDifferenceEmpty) {
    return {
      success: true,
      txPlan: {
        ...draft,
        collateralInputs: draftWithChange.collateralInputs,
        change: [{...adaOnlyChangeOutput, coins: remainingAdaOnlyChangeLovelace}],
        fee: feeWithAdaOnlyChange as Lovelace,
        baseFee: feeWithAdaOnlyChange,
      },
    }
  }

  // From this point on, change includes also tokens

  const tokenChangeOutputs: TxOutput[] = createTokenChangeOutputs({
    changeAddress: possibleChange.address,
    changeTokenBundle: tokenDifference,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    protocolParameters,
  })

  const {error: tokenChangeCollateralError, txPlan: draftWithTokenChange} = addCollateralsIfNeeded(
    {
      ...draft,
      collateralInputs, // reset collaterals
      outputs: [...draft.outputs, ...tokenChangeOutputs],
    },
    availableCollateralInputs
  )

  const feeWithTokenChange = computeRequiredTxFee(draftWithTokenChange)

  const minimalTokenChangeLovelace = sumCoins(tokenChangeOutputs)

  const remainingTokenChangeLovelace = totalInput
    .minus(totalOutput)
    .minus(minimalTokenChangeLovelace)
    .minus(feeWithTokenChange) as Lovelace

  // remainingTokenChangeLovelace has to be positive,
  // otherwise not enough funds to pay for change outputs
  if (remainingTokenChangeLovelace.isNegative()) {
    return {
      success: false,
      minimalLovelaceAmount: additionalLovelaceAmount,
      estimatedFee: feeWithTokenChange,
      deposit,
      error: {
        code: UnexpectedErrorReason.CannotConstructTxPlan,
        subCode: UnexpectedErrorSubCode.InsufficientAda,
        reason: 'Not enough ada left for token change',
      },
    }
  } else if (tokenChangeCollateralError) {
    // not enough collateral to add a token utxo
    return {
      success: false,
      minimalLovelaceAmount: additionalLovelaceAmount,
      estimatedFee: feeWithTokenChange,
      deposit,
      error: {
        code: UnexpectedErrorReason.CannotConstructTxPlan,
        reason: `Not enough colletarals to add token change utxo ${tokenChangeCollateralError}`,
      },
    }
  }

  // if remainingTokenChangeLovelace is positive, we try to put it in ada only change output
  const {error: tokenAdaOnlyCollateralError, txPlan: draftWithTokenAdaChange} = addCollateralsIfNeeded(
    {
      ...draft,
      collateralInputs, // reset collaterals
      outputs: [...draft.outputs, ...tokenChangeOutputs, adaOnlyChangeOutput],
    },
    availableCollateralInputs
  )

  const feeWithAdaAndTokenChange = computeRequiredTxFee(draftWithTokenAdaChange)
  const adaOnlyChangeOutputLovelace = remainingTokenChangeLovelace.minus(
    feeWithAdaAndTokenChange.minus(feeWithTokenChange)
  ) as Lovelace

  if (adaOnlyChangeOutputLovelace.gt(MIN_UTXO_VALUE) && !tokenAdaOnlyCollateralError) {
    return {
      success: true,
      txPlan: {
        ...draft,
        collateralInputs: draftWithTokenAdaChange.collateralInputs,
        change: [{...adaOnlyChangeOutput, coins: adaOnlyChangeOutputLovelace}, ...tokenChangeOutputs],
        fee: feeWithAdaAndTokenChange,
        baseFee: feeWithAdaAndTokenChange,
      },
    }
  }

  // if remainingTokenChangeLovelace is too small for separate output,
  // we add the remainingTokenChangeLovelace to the first changeOutput

  const firstChangeOutput: TxOutput = {
    ...tokenChangeOutputs[0],
    coins: tokenChangeOutputs[0].coins.plus(remainingTokenChangeLovelace) as Lovelace,
  }

  return {
    success: true,
    txPlan: {
      ...draft,
      collateralInputs: draftWithTokenChange.collateralInputs,
      change: tokenChangeOutputs.map((output, i) => (i === 0 ? firstChangeOutput : output)),

      fee: feeWithTokenChange,
      baseFee: feeWithTokenChange,
    },
  }
}

/**
 * Compute strict transaction plan takes a transaction draft with a possible
 * change output and creates a plan that doesn't add any more inputs or
 * collateral inputs to the transaction, and in case it needs to create
 * a change output, it creates a change output with both the remaining
 * Lovelace change and remaining token bundles in it.
 */
export function computeStrictTxPlan({
  inputs,
  collateralInputs = [],
  outputs,
  possibleChange,
  certificates,
  withdrawals,
  datums,
  scripts,
  redeemers = [],
  mint = [],
  planId,
  requiredSigners = [],
  protocolParameters,
  metadata,
}: ComputeStrictTxPlanParams): TxPlanResult {
  const totalRewards = sumRewards(withdrawals)
  const totalInput = sumCoins(inputs).plus(totalRewards)

  const totalCollaterals = sumCoins(collateralInputs)

  const deposit = computeRequiredDeposit(certificates, protocolParameters)
  const totalOutput = sumCoins(outputs).plus(deposit)

  const totalInputTokens = aggregateTokenBundles([...inputs.map(({tokenBundle}) => tokenBundle), mint])
  const totalOutputTokens = aggregateTokenBundles(outputs.map(({tokenBundle}) => tokenBundle))
  const tokenDifference = getTokenBundlesDifference(totalInputTokens, totalOutputTokens)

  const draftPlan: TxPlan = {
    inputs,
    collateralInputs,
    outputs,
    change: [],
    certificates,
    deposit,
    additionalLovelaceAmount: ZeroLovelace,
    baseFee: ZeroLovelace,
    fee: ZeroLovelace,
    mint: removeEmptyArray(mint),
    withdrawals,
    datums: removeEmptyArray(datums),
    scripts: removeEmptyArray(scripts),
    redeemers: removeEmptyArray(redeemers),
    planId,
    requiredSigners: removeEmptyArray(requiredSigners),
    protocolParameters,
    metadata,
  }

  // If some token bundle contains negative amount of tokens, we don't have
  // enough tokens in the input and we cannot construct the transaction
  if (tokenDifference.some(({quantity}) => quantity.isNegative())) {
    return {
      success: false,
      minimalLovelaceAmount: ZeroLovelace,
      estimatedFee: ZeroLovelace,
      deposit,
      error: {
        code: UnexpectedErrorReason.CannotConstructTxPlan,
        reason: 'tokens',
      },
    }
  }

  const feeWithoutChange = computeRequiredTxFee(draftPlan)

  // Check whether we have enough collaterals for the given transaction,
  // this only applies to transaction which contain some scripts
  const requiredCollateralsWithoutChange = feeToRequiredCollateral(
    feeWithoutChange,
    protocolParameters.collateralPercentage
  )
  if (
    draftPlan.scripts &&
    draftPlan.scripts.length > 0 &&
    totalCollaterals.lt(requiredCollateralsWithoutChange)
  ) {
    return {
      success: false,
      minimalLovelaceAmount: ZeroLovelace,
      estimatedFee: feeWithoutChange,
      deposit,
      error: {
        code: UnexpectedErrorReason.CannotConstructTxPlan,
        reason: `collaterals: total ${totalCollaterals}, required ${requiredCollateralsWithoutChange}`,
      },
    }
  }

  const remainingChange = totalInput.minus(totalOutput).minus(feeWithoutChange)

  // Cannot construct transaction plan, because the remaining change
  // is negative, e.g. we don't have enough Lovelace in the outputs
  if (remainingChange.isNegative()) {
    return {
      success: false,
      minimalLovelaceAmount: ZeroLovelace,
      estimatedFee: feeWithoutChange,
      deposit,
      error: {
        code: UnexpectedErrorReason.CannotConstructTxPlan,
        reason: 'balance',
        message: `${remainingChange} = ${totalInput} - ${totalOutput} - ${feeWithoutChange}`,
      },
    }
  }

  const hasChangePlaceholder = outputs.some((output) => output.isChange)

  // If all tokens are balanced and there is no change left we can construct
  // the transaction plan right here, assuming the user did not require a placeholder change
  const areTokensBalanced =
    tokenDifference.length === 0 || tokenDifference.every(({quantity}) => quantity.isZero())
  if (areTokensBalanced && remainingChange.isZero() && !hasChangePlaceholder) {
    return {
      success: true,
      txPlan: {
        ...draftPlan,
        fee: feeWithoutChange,
        baseFee: feeWithoutChange,
      },
    }
  }

  // From this point on we are sure its not a perfect fit
  // Because we need to calculate a correct change, in strict mode we try
  // to create a change that doesn't split the remaining Lovelace change
  // from the remaining tokens

  if (!hasChangePlaceholder) {
    const changeOutputDraft: TxOutput = {
      isChange: true,
      address: possibleChange.address,
      coins: ZeroLovelace,
      tokenBundle: [],
    }
    draftPlan.outputs = [...draftPlan.outputs, changeOutputDraft]
  } else {
    // create a copy of the first change output, so we don't accidentally override
    // with the change manipulation below
    const changeIndex = draftPlan.outputs.findIndex((output) => output.isChange)
    draftPlan.outputs = [...draftPlan.outputs]
    draftPlan.outputs[changeIndex] = {...draftPlan.outputs[changeIndex]}
  }

  // First add all the remaining tokens
  const changeOutputRef = draftPlan.outputs.find((output) => output.isChange)!
  changeOutputRef.tokenBundle = aggregateTokenBundles([
    changeOutputRef.tokenBundle,
    tokenDifference.filter(({quantity}) => !quantity.isEqualTo(ZeroLovelace)),
  ])

  const feeWithChange = computeRequiredTxFee(draftPlan)

  // We again need to check whether the collaterals are enough for the newly
  // calculated fee for the transaction with the change output
  const requiredCollateralsWithChange = feeToRequiredCollateral(
    feeWithChange,
    protocolParameters.collateralPercentage
  )
  if (
    draftPlan.scripts &&
    draftPlan.scripts.length > 0 &&
    totalCollaterals.lt(requiredCollateralsWithChange)
  ) {
    return {
      success: false,
      minimalLovelaceAmount: ZeroLovelace,
      estimatedFee: feeWithChange,
      deposit,
      error: {
        code: UnexpectedErrorReason.CannotConstructTxPlan,
        reason: `collaterals: total ${totalCollaterals}, required ${requiredCollateralsWithChange}`,
      },
    }
  }

  // Now we can complete the change output with the ADA change that is left in the
  // transaction
  changeOutputRef.coins = changeOutputRef.coins.plus(
    totalInput.minus(totalOutput).minus(feeWithChange)
  ) as Lovelace

  // If the change is not enough to cover creating a UTxO with the necessary
  // token bundle we cannot construct the change output
  if (
    changeOutputRef.coins.isLessThan(
      computeMinUTxOLovelaceAmount({
        protocolParameters,
        address: changeOutputRef.address,
        tokenBundle: changeOutputRef.tokenBundle,
      })
    )
  ) {
    return {
      success: false,
      minimalLovelaceAmount: ZeroLovelace,
      estimatedFee: feeWithChange,
      deposit,
      error: {
        code: UnexpectedErrorReason.CannotConstructTxPlan,
        reason: 'change output',
      },
    }
  }

  // Otherwise we can create the new plan with the change
  return {
    success: true,
    txPlan: {
      ...draftPlan,
      fee: feeWithChange as Lovelace,
      baseFee: feeWithChange,
    },
  }
}

export const validateTxPlan = (txPlanResult: TxPlanResult): TxPlanResult => {
  if (txPlanResult.success === false) {
    return txPlanResult
  }
  const {txPlan} = txPlanResult
  const {
    change,
    outputs,
    withdrawals,
    collateralInputs,
    fee,
    additionalLovelaceAmount,
    certificates,
    deposit,
    baseFee,
    scripts,
    protocolParameters,
  } = txPlan

  const noTxPlan: TxPlanResult = {
    success: false,
    error: null,
    estimatedFee: fee,
    deposit,
    minimalLovelaceAmount: additionalLovelaceAmount,
  }

  const outputsWithChange = [...outputs, ...change]
  if (
    outputsWithChange.some(({coins, tokenBundle}) => {
      coins.gt(MAX_INT64) || tokenBundle.some(({quantity}) => quantity.gt(MAX_INT64))
    })
  ) {
    throw new CabInternalError(CabInternalErrorReason.CoinAmountError)
  }

  // we cant build the transaction with big enough change lovelace
  if (
    change.some(({address, coins, tokenBundle, dataHash}) =>
      coins.lt(
        computeMinUTxOLovelaceAmount({
          protocolParameters,
          address,
          tokenBundle,
          datumHash: dataHash,
        })
      )
    )
  ) {
    return {
      ...noTxPlan,
      error: {code: CabInternalErrorReason.ChangeOutputTooSmall},
    }
  }

  if (
    outputs.some(({address, coins, tokenBundle, dataHash}) =>
      coins.lt(
        computeMinUTxOLovelaceAmount({
          protocolParameters,
          address,
          tokenBundle,
          datumHash: dataHash,
        })
      )
    )
  ) {
    return {
      ...noTxPlan,
      error: {code: CabInternalErrorReason.OutputTooSmall},
    }
  }

  if (
    outputsWithChange.some(
      (output) => encode(cborizeSingleTxOutput(output)).length > protocolParameters.maxTxSize
    )
  ) {
    return {
      ...noTxPlan,
      error: {code: CabInternalErrorReason.OutputTooBig},
    }
  }

  const estimatedSize = estimateTxSize({
    ...txPlan,
    datums: txPlan.datums || [],
    redeemers: txPlan.redeemers || [],
    scripts: txPlan.scripts || [],
    mint: txPlan.mint || [],
  })
  if (estimatedSize > protocolParameters.maxTxSize) {
    return {
      ...noTxPlan,
      error: {
        code: CabInternalErrorReason.TxTooBig,
        message: `Size ${estimatedSize} > ${protocolParameters.maxTxSize}`,
      },
    }
  }

  if (collateralInputs.some((input) => input.tokenBundle.length > 0)) {
    return {
      ...noTxPlan,
      error: {code: CabInternalErrorReason.BadCollaterals},
    }
  }
  const requireCollateral =
    scripts && scripts.length > 0
      ? feeToRequiredCollateral(fee, protocolParameters.collateralPercentage)
      : new Lovelace(0)
  const availableCollateral = sumCoins(collateralInputs)
  if (
    requireCollateral.gt(availableCollateral) ||
    collateralInputs.length > protocolParameters.maxCollateralInputs
  ) {
    return {
      ...noTxPlan,
      error: {code: CabInternalErrorReason.BadCollaterals},
    }
  }

  const totalRewards = sumRewards(withdrawals)
  // When deregistering stake key, returned "deposit" should be in all cases higher than the Tx fee
  const isDeregisteringStakeKey = certificates.some(
    (c) => c.type === TxCertificateType.STAKING_KEY_DEREGISTRATION
  )
  if (
    !isDeregisteringStakeKey &&
    ((totalRewards.gt(0) && totalRewards.lt(fee)) || (totalRewards.gt(0) && fee.gt(baseFee)))
  ) {
    return {
      ...noTxPlan,
      error: {code: CabInternalErrorReason.RewardsBalanceTooLow},
    }
  }
  return txPlanResult
}
