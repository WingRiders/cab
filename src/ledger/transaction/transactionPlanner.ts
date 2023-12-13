import {flatten, isEqual, isNil, uniqBy, uniqWith} from 'lodash'

import {CabInternalErrorReason} from '@/errors'
import {optionalFields} from '@/helpers'
import {aggregateTokenBundles} from '@/ledger/assets'
import {getLogger} from '@/logger'
import {Address, BigNumber, Lovelace, ZeroLovelace} from '@/types/base'
import {
  TxDatumOptionType,
  TxInput,
  TxMintRedeemer,
  TxOutput,
  TxOutputType,
  TxRedeemer,
  TxScriptSource,
  TxSpendRedeemer,
  TxWitnessSet,
  UTxO,
} from '@/types/transaction'
import {TxPlan, TxPlanArgs, TxPlanDraft, TxPlanResult, TxPlanType} from '@/types/txPlan'

import {arrangeUtxos} from './arrangeUtxos'
import {computeStrictTxPlan, computeTxPlan, validateTxPlan} from './computeTxPlan'
import {encodeMetadata} from './metadata/encodeMetadata'
import {computeScriptIntegrity} from './scriptIntegrity'
import {ShelleyTxAux} from './shelleyTransaction'
import {computeMinUTxOLovelaceAmount, hashDatum, hashSerialized} from './utils'

const prepareTxPlanDraft = (txPlanArgs: TxPlanArgs): TxPlanDraft => ({
  inputs: (txPlanArgs.inputs || []).map((input) => input.utxo),
  referenceInputs: uniqWith(
    flatten([
      ...(txPlanArgs.referenceInputs || []),
      ...(txPlanArgs.referenceScripts || []).map(({txInputRef}) => txInputRef),
      ...(txPlanArgs.mint || []).map(({script}) =>
        script.isReferenceScript ? [script.txInputRef] : []
      ),
    ]),
    isEqual
  ),
  collateralInputs: txPlanArgs.collateralInputs,
  outputs: (txPlanArgs.outputs || []).map((output): TxOutput => {
    const isPostAlonzo = output.inlineDatum || output.inlineScript

    const commonFields = {
      isChange: output.isChangePlaceholder ?? false,
      address: output.address,
      coins: output.coins,
      tokenBundle: output.tokenBundle,
    }
    const draftOutput: TxOutput = isPostAlonzo
      ? {
          type: TxOutputType.POST_ALONZO,
          ...commonFields,
          ...(!isNil(output.inlineScript) ? {scriptRef: output.inlineScript} : undefined),
          ...(isNil(output.datum)
            ? undefined
            : {
                datumOption: output.inlineDatum
                  ? {type: TxDatumOptionType.INLINED_DATUM, datum: output.datum}
                  : {type: TxDatumOptionType.HASH, hash: hashDatum(output.datum)},
              }),
        }
      : {
          type: TxOutputType.LEGACY,
          ...commonFields,
          ...(!isNil(output.datum) ? {datumHash: hashDatum(output.datum)} : undefined),
        }
    const minCoins = computeMinUTxOLovelaceAmount({
      protocolParameters: txPlanArgs.protocolParameters,
      output: draftOutput,
    })

    // adjust the mincoins by patching the output
    if (output.coins.isLessThan(minCoins)) {
      getLogger().warn(
        `Transaction planner: Output coins were insufficient and were automatically increased from ${output.coins.toString()} to ${minCoins.toString()}.`
      )
      draftOutput.coins = minCoins
    }
    return draftOutput
  }),
  certificates: txPlanArgs.certificates || [],
  withdrawals: txPlanArgs.withdrawals || [],
  mint: aggregateTokenBundles((txPlanArgs.mint || []).map((mint) => mint.tokenBundle)),
  datums: uniqBy(
    flatten([
      ...(txPlanArgs.inputs || []).map(({isScript, utxo: {datum, inlineDatum}}) =>
        // Including inline datum here would cause Ogmios to throw unspendableDatums error
        isScript && !isNil(datum) && !inlineDatum ? [datum] : []
      ),
      ...(txPlanArgs.referenceInputs || []).map(({datum}) => (!isNil(datum) ? [datum] : [])),
      ...(txPlanArgs.outputs || []).map((output) =>
        // Including inline datum here would cause Ogmios to throw unspendableDatums error
        !isNil(output.datum) && !output.inlineDatum ? [output.datum] : []
      ),
    ]),
    hashDatum
  ),
  redeemers: flatten<TxRedeemer>([
    ...(txPlanArgs.inputs || []).map((input): TxSpendRedeemer[] =>
      input.isScript
        ? [
            {
              ...input.redeemer,
              ref: {txHash: input.utxo.txHash, outputIndex: input.utxo.outputIndex},
            },
          ]
        : []
    ),
    ...(txPlanArgs.mint || []).map(
      (mint): TxMintRedeemer => ({
        ...mint.redeemer,
        ref: {policyId: mint.tokenBundle[0]?.policyId || ''},
      })
    ),
  ]),
  scripts: uniqBy(
    flatten([
      ...(txPlanArgs.inputs || []).map((input) =>
        input.isScript && !input.isReferenceScript ? [input.script] : []
      ),
      ...(txPlanArgs.mint || []).map((mint) => [mint.script]),
      ...(txPlanArgs.referenceScripts || []).map(
        (referenceScript) =>
          ({
            ...referenceScript,
            isReferenceScript: true,
          } as TxScriptSource)
      ),
    ]),
    (script) => (script.isReferenceScript ? script.scriptHash : script.bytes)
  ),
  planId: txPlanArgs.planId,
  requiredSigners: txPlanArgs.requiredSigners || [],
  protocolParameters: txPlanArgs.protocolParameters,
  metadata: txPlanArgs.metadata,
})

export const selectMinimalTxPlan = (
  utxos: Array<UTxO>,
  potentialCollaterals: Array<UTxO>,
  changeAddress: Address,
  txPlanArgs: TxPlanArgs
): TxPlanResult => {
  const draft = prepareTxPlanDraft(txPlanArgs)

  if (txPlanArgs.planType === TxPlanType.STRICT) {
    return validateTxPlan(computeStrictTxPlan({...draft, changeAddress}))
  }

  // collaterals can double as inputs as well in case of not enough balance
  const orderedUtxos = [...utxos, ...potentialCollaterals]

  let txPlanResult: TxPlanResult
  let numInputs = 0
  do {
    const inputs: TxInput[] = [...draft.inputs, ...orderedUtxos.slice(0, numInputs)]
    txPlanResult = validateTxPlan(
      computeTxPlan({
        ...draft,
        inputs,
        availableCollateralInputs: potentialCollaterals,
        changeAddress,
      })
    )
    if (txPlanResult.success === true) {
      if (
        /* prefer plans where we don't add extra ada into the fee */
        txPlanResult.txPlan.baseFee === txPlanResult.txPlan.fee ||
        /* unless we would be using collaterals or we've used up all utxos */
        numInputs >= utxos.length
      ) {
        return txPlanResult
      }
    }
    if (!txPlanResult.success && txPlanResult.error.code === CabInternalErrorReason.TxTooBig) {
      // Adding inputs won't help lowering tx size
      break
    }
    numInputs += 1
  } while (numInputs <= orderedUtxos.length)
  return txPlanResult
}

export const prepareTxAux = (
  txPlan: TxPlan,
  ttl?: number | BigNumber,
  validityIntervalStart?: number | BigNumber
) => {
  const {
    inputs,
    referenceInputs,
    collateralInputs,
    outputs,
    change,
    fee,
    certificates,
    withdrawals,
    scripts,
    datums,
    redeemers,
    mint,
    requiredSigners,
  } = txPlan
  const txTtl = ttl ?? null
  const txValidityIntervalStart = validityIntervalStart ?? null

  const metadata = encodeMetadata(txPlan.metadata)

  const txOutputs: TxOutput[] = (() => {
    // if there is one output with isChange set to true (change placeholder)
    // and if all `change` outputs have the same address
    // then we replace the output with isChange set to true with output
    // that is the sum of all items from `change` (summing coins and tokenBundle)
    if (
      outputs.filter(({isChange}) => isChange).length === 1 &&
      change.length > 0 &&
      uniqBy(change, ({address}) => address).length === 1
    ) {
      const mergedChange = change.reduce<TxOutput>(
        (acc, change) => ({
          ...acc,
          coins: acc.coins.plus(change.coins) as Lovelace,
          tokenBundle: aggregateTokenBundles([acc.tokenBundle, change.tokenBundle]),
        }),
        {
          type: TxOutputType.POST_ALONZO,
          address: change[0].address,
          coins: ZeroLovelace,
          tokenBundle: [],
          isChange: true,
        }
      )
      return outputs.map((output) => (output.isChange ? mergedChange : output))
    }
    return [...outputs, ...change]
  })()

  // TODO: return standardized format
  return new ShelleyTxAux({
    inputs,
    referenceInputs,
    collateralInputs,
    outputs: txOutputs,
    fee,
    ttl: txTtl,
    certificates,
    withdrawals,
    validityIntervalStart: txValidityIntervalStart,
    scripts,
    datums,
    redeemers,
    mint,
    requiredSigners,
    scriptIntegrity: computeScriptIntegrity(txPlan),

    // metadata
    auxiliaryDataHash: metadata ? hashSerialized(metadata) : '', // precompute hash without voting data
    votingData: txPlan.metadata?.votingData, // voting data specifically handled
    metadata,
  })
}

export const prepareTxWitnessSet = (txPlan: TxPlan): TxWitnessSet =>
  optionalFields({
    plutusScripts: txPlan.scripts,
    plutusDatums: txPlan.datums,
    redeemers: txPlan.redeemers,
  })

export function getTxPlan(txPlanArgs: TxPlanArgs, utxos: UTxO[], changeAddress: Address): TxPlanResult {
  const [arrangedUtxos, potentialCollaterals] = arrangeUtxos(utxos, txPlanArgs)
  return selectMinimalTxPlan(arrangedUtxos, potentialCollaterals, changeAddress, txPlanArgs)
}
