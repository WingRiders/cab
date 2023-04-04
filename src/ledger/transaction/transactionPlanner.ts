import {flatten, isNil, uniqBy} from 'lodash'
import {Address, Lovelace, ZeroLovelace, BigNumber} from '@/types/base'
import {
  UTxO,
  TxInput,
  TxOutput,
  TxRedeemer,
  TxSpendRedeemer,
  TxMintRedeemer,
  TxWitnessSet,
} from '@/types/transaction'
import {TxPlanArgs, TxPlanDraft, TxPlanResult, TxPlan, TxPlanType} from '@/types/txPlan'
import {computeTxPlan, computeStrictTxPlan, validateTxPlan} from './computeTxPlan'
import {computeMinUTxOLovelaceAmount, hashSerialized, hashDatum} from './utils'
import {aggregateTokenBundles} from '@/ledger/assets'
import {getLogger} from '@/logger'
import {ShelleyTxAux} from './shelleyTransaction'
import {arrangeUtxos} from './arrangeUtxos'
import {optionalFields} from '@/helpers'
import {computeScriptIntegrity} from './scriptIntegrity'
import {encodeMetadata} from './metadata/encodeMetadata'

const prepareTxPlanDraft = (txPlanArgs: TxPlanArgs): TxPlanDraft => ({
  inputs: (txPlanArgs.inputs || []).map((input) => input.utxo),
  collateralInputs: txPlanArgs.collateralInputs,
  outputs: (txPlanArgs.outputs || []).map((output) => {
    const minCoins = computeMinUTxOLovelaceAmount({
      protocolParameters: txPlanArgs.protocolParameters,
      address: output.address,
      tokenBundle: output.tokenBundle,
      datumHash: output.datum ? hashDatum(output.datum) : undefined,
    })
    if (output.coins.isLessThan(minCoins)) {
      getLogger().warn(
        `Transaction planner: Output coins were insufficient and were automatically increased from ${output.coins.toString()} to ${minCoins.toString()}.`
      )
    }

    return {
      isChange: output.isChangePlaceholder ?? false,
      address: output.address,
      coins: Lovelace.max(minCoins, output.coins) as Lovelace,
      tokenBundle: output.tokenBundle,
      ...(!isNil(output.datum) ? {dataHash: hashDatum(output.datum)} : undefined),
    }
  }),
  certificates: txPlanArgs.certificates || [],
  withdrawals: txPlanArgs.withdrawals || [],
  mint: aggregateTokenBundles((txPlanArgs.mint || []).map((mint) => mint.tokenBundle)),
  datums: uniqBy(
    flatten([
      ...(txPlanArgs.inputs || []).map(({isScript, utxo: {datum}}) =>
        isScript && !isNil(datum) ? [datum] : []
      ),
      ...(txPlanArgs.outputs || []).map((output) => (!isNil(output.datum) ? [output.datum] : [])),
    ]),
    hashDatum
  ),
  redeemers: flatten<TxRedeemer>([
    // todo build the references here
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
      ...(txPlanArgs.inputs || []).map((input) => (input.isScript ? [input.script] : [])),
      ...(txPlanArgs.mint || []).map((mint) => mint.script),
    ]),
    (script) => script.bytes
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

  const possibleChange: TxOutput = {
    isChange: true,
    address: changeAddress,
    coins: ZeroLovelace,
    tokenBundle: [],
  }

  if (txPlanArgs.planType === TxPlanType.STRICT) {
    return validateTxPlan(computeStrictTxPlan({...draft, possibleChange}))
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
        possibleChange,
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

  // TODO: return standardized format
  return new ShelleyTxAux({
    inputs,
    collateralInputs,
    outputs: [...outputs, ...change],
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
