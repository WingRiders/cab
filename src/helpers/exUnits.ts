import {ExecutionUnits} from '@cardano-ogmios/schema'
import {chain, keyBy} from 'lodash'
import isNumber from 'lodash/isNumber'

import {CabInternalError, CabInternalErrorReason} from '@/errors'
import {getTxPlan, prepareTxAux, prepareTxWitnessSet, signedTransaction} from '@/ledger/transaction'
import {getLogger} from '@/logger'
import {
  Address,
  BigNumber,
  GenericInput,
  GenericOutput,
  Lovelace,
  ProtocolParameters,
  TxPlan,
  TxPlanArgs,
  TxPlanResult,
  TxPlanType,
  UTxO,
  ZeroLovelace,
} from '@/types'

import {orderInputs} from './orderInputs'
import {orderMintScripts} from './orderMintScripts'
import {request} from './request'
import {utxoId} from './utxoId'

const TxRedeemers = ['spend', 'mint', 'cert', 'reward'] as const
const stringTxRedeemers: readonly string[] = TxRedeemers

type RedeemerPointer = {
  purpose: (typeof TxRedeemers)[number]
  index: number
}

type EvaluationResult = {
  validator: RedeemerPointer
  budget: ExecutionUnits
}

export type Evaluations = EvaluationResult[]

export type EvaluateTxBodyFn = (txBody: string) => Promise<
  | {success: true; evaluations: Evaluations}
  | {
      success: false
      cause?: 'Overspent budget' | 'Deserialization failure'
    }
>

export function assertEvaluations(data: unknown): asserts data is Evaluations {
  if (
    !Array.isArray(data) ||
    !data.every((evaluationResult) => {
      if (typeof evaluationResult !== 'object') {
        return false
      }
      if (!['validator', 'budget'].every((key) => key in evaluationResult)) {
        return false
      }
      const redeemerPointer = evaluationResult.validator
      if (typeof redeemerPointer !== 'object') {
        return false
      }
      if (!['purpose', 'index'].every((key) => key in redeemerPointer)) {
        return false
      }
      if (!stringTxRedeemers.includes(redeemerPointer.purpose)) {
        return false
      }
      if (!isNumber(redeemerPointer.index)) {
        return false
      }
      const txExUnits = evaluationResult.budget
      if (typeof txExUnits !== 'object') {
        return false
      }
      if (!['memory', 'cpu'].every((key) => key in txExUnits)) {
        return false
      }
      if (!isNumber(txExUnits.memory) || !isNumber(txExUnits.cpu)) {
        return false
      }
      return true
    })
  ) {
    throw new Error('Provided evaluations are not in a valid format')
  }
}

export function assertExUnitsNotExceeded(
  evaluations: Evaluations,
  {maxExecutionUnitsPerTransaction}: ProtocolParameters
) {
  const totalOgmiosExUnits = getTotalOgmiosExUnits(evaluations)

  if (totalOgmiosExUnits.memory > maxExecutionUnitsPerTransaction.memory) {
    throw new CabInternalError(CabInternalErrorReason.MaxTxExUnitsExceeded, {
      message: `Transaction exceeded maximum memory exUnits (used=${totalOgmiosExUnits.memory}, max=${maxExecutionUnitsPerTransaction.memory})`,
    })
  }
  if (totalOgmiosExUnits.cpu > maxExecutionUnitsPerTransaction.cpu) {
    throw new CabInternalError(CabInternalErrorReason.MaxTxExUnitsExceeded, {
      message: `Transaction exceeded maximum cpu exUnits (used=${totalOgmiosExUnits.cpu}, max=${maxExecutionUnitsPerTransaction.cpu})`,
    })
  }
}

export const evaluateTxBodyFactory =
  (apiServerUrl: string): EvaluateTxBodyFn =>
  async (txBody) => {
    try {
      const res = await request(`${apiServerUrl}/evaluateTx`, 'POST', JSON.stringify(txBody), {
        'Content-Type': 'application/json',
      })

      assertEvaluations(res)

      return {success: true, evaluations: res}
    } catch (e) {
      getLogger().error(e, 'Error evaluating tx')
      return {success: false}
    }
  }

export const getTotalExUnits = (txPlan: TxPlan): ExecutionUnits =>
  (txPlan.redeemers || [])
    .map(({exUnits}) => exUnits)
    .reduce((acc, curr) => ({memory: acc.memory + curr.memory, cpu: acc.cpu + curr.cpu}), {
      memory: 0,
      cpu: 0,
    })

export const getTotalOgmiosExUnits = (evaluations: {budget: ExecutionUnits}[]) =>
  evaluations.reduce(
    (acc, curr) => ({memory: acc.memory + curr.budget.memory, cpu: acc.cpu + curr.budget.cpu}),
    {memory: 0, cpu: 0}
  )

/**
 * Assumes that the same txPlanArgs are passed in as were used
 * to evaluate the transaction.
 * @param evaluations evaluation for a strict plan
 * @param txPlanArgs the original plan
 * @returns the updated strict plan with the updated exunits
 */
const assignExUnitsToTxPlanArgs = (evaluations: Evaluations, txPlanArgs: TxPlanArgs): TxPlanArgs => {
  if (txPlanArgs.planType !== TxPlanType.STRICT) {
    throw new CabInternalError(CabInternalErrorReason.Error, {
      message: 'TxPlan needs to be strict to assign evaluations',
    })
  }

  const exUnits: Partial<Record<(typeof TxRedeemers)[number], Record<number, ExecutionUnits>>> = chain(
    evaluations
  )
    .groupBy(({validator}) => validator.purpose)
    .mapValues((evaluationsInGroup) =>
      Object.fromEntries(evaluationsInGroup.map(({validator, budget}) => [validator.index, budget]))
    )
    .value()

  const spendExUnitsByIndex = exUnits['spend'] || {}
  const mintExUnitsByIndex = exUnits['mint'] || {}

  const sortedInputs = txPlanArgs.inputs ? orderInputs(txPlanArgs.inputs) : undefined
  const sortedMints = txPlanArgs.mint ? orderMintScripts(txPlanArgs.mint) : undefined

  return {
    ...txPlanArgs,
    inputs: sortedInputs?.map((input, index) =>
      input.isScript && spendExUnitsByIndex[index] // if not available fallback to original exUnits
        ? {
            ...input,
            redeemer: {
              ...input.redeemer,
              exUnits: spendExUnitsByIndex[index],
            },
          }
        : input
    ),
    mint: sortedMints?.map((mint, index) =>
      mintExUnitsByIndex[index] // if not available fallback to the original exUnits
        ? {
            ...mint,
            redeemer: {
              ...mint.redeemer,
              exUnits: mintExUnitsByIndex[index],
            },
          }
        : mint
    ),
  }
}

/**
 * Creates a transaction plan and evaluates the budget to be used.
 *
 * Assumes that any scripts have very pessimistic estimates for the budgets,
 * so there is always change ADA that can be returned to the user.
 */
export async function getEvaluatedTxPlan({
  txPlanArgs: origTxPlanArgs,
  utxos,
  changeAddress,
  evaluateTxBodyFn,
  validityIntervalStart,
  ttl,
  allowExceededExUnits,
}: {
  txPlanArgs: TxPlanArgs
  /** should be pubkey-only utxo list for now */
  utxos: UTxO[]
  changeAddress: Address
  evaluateTxBodyFn: EvaluateTxBodyFn
  validityIntervalStart?: number
  ttl?: number
  allowExceededExUnits?: boolean
}): Promise<TxPlanResult> {
  if (utxos.some((utxo) => utxo == null))
    throw new Error(
      `Cannot create TxPlan ${origTxPlanArgs.planId}, there is a null UTxO in the arguments`
    )
  if (origTxPlanArgs.inputs?.some(({utxo}) => utxo == null))
    throw new Error(
      `Cannot create TxPlan ${origTxPlanArgs.planId}, there is a null UTxO in the inputs of TxPlanArgs`
    )

  const baseTxPlan = getTxPlan(origTxPlanArgs, utxos, changeAddress)

  if (baseTxPlan.success === false) {
    return baseTxPlan
  }

  const txAux = prepareTxAux(baseTxPlan.txPlan, ttl, validityIntervalStart)
  // this will add all necessary witnesses apart from signatures
  const txWitnessSet = prepareTxWitnessSet(baseTxPlan.txPlan)
  // pretend that we have a signed transaction
  const unsignedTransaction = signedTransaction(txAux, txWitnessSet)

  const evaluation = await evaluateTxBodyFn(unsignedTransaction.txBody)

  if (!evaluation.success) {
    return {
      ...evaluation,
      error: {
        code: CabInternalErrorReason.FailedToEvaluateTx,
      },
      estimatedFee: baseTxPlan.txPlan.fee,
      minimalLovelaceAmount: baseTxPlan.txPlan.additionalLovelaceAmount,
      deposit: new BigNumber(0) as Lovelace,
    }
  }

  if (!allowExceededExUnits) {
    assertExUnitsNotExceeded(evaluation.evaluations, origTxPlanArgs.protocolParameters)
  }

  const plan = baseTxPlan.txPlan

  const utxosById = keyBy(utxos, (utxo) => utxoId(utxo))
  const origInputsById = keyBy(origTxPlanArgs.inputs || [], (input) => utxoId(input.utxo))

  // extend the original tx plan arguments and make it strict
  const newTxPlanArgs: TxPlanArgs = {
    ...origTxPlanArgs,
    planType: TxPlanType.STRICT,
    inputs: plan.inputs.map((input): GenericInput => {
      const id = utxoId(input)
      if (origInputsById[id]) return origInputsById[id]
      if (utxosById[id])
        return {
          // assuming the utxo list is pubkey only
          isScript: false,
          // if the input wasn't part of the args, it has to be part of the input utxos
          utxo: utxosById[id],
        }
      // Should not happen, because getTxPlan uses only UTxOs defined in its arguments
      throw new Error(
        `Cannot create TxPlan ${origTxPlanArgs.planId}, UTxO ${id} is not defined in the inputs nor in the additional UTxOs`
      )
    }),

    // assume that only change outputs were added to the end
    // and we reset the change outputs ADA value, as that's the only
    // thing that could change due to budget change. The txplan automatically
    // would add minimum ADA to all change outputs and should adjust the ADA change
    // on the first change output
    outputs: plan.outputs.map((output, index): GenericOutput => {
      const argsOutput = origTxPlanArgs.outputs?.[index]
      if (argsOutput) {
        return argsOutput
      }
      if (output.isChange) {
        // reset the additional change
        return {...output, coins: ZeroLovelace, isChangePlaceholder: true}
      }
      return output
    }),
  }

  const adjustedTxPlanArgs = assignExUnitsToTxPlanArgs(evaluation.evaluations, newTxPlanArgs)

  return getTxPlan(adjustedTxPlanArgs, utxos, changeAddress)
}
