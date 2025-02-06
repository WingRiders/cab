import {Account} from '@/account/Account'
import {EvaluateTxBodyFn, getEvaluatedTxPlan} from '@/helpers/exUnits'
import {sleep} from '@/helpers/sleep'
import {getLogger} from '@/logger'
import {TxPlanArgs, TxPlanResult} from '@/types'

type GetEvaluatedTxPlanWithRetriesParams = {
  txPlanArgs: TxPlanArgs
  account: Account
  evaluateTxBodyFn: EvaluateTxBodyFn
  remainingRetries: number
  retryIntervalMillis: number
}

export const getEvaluatedTxPlanWithRetries = async (
  params: GetEvaluatedTxPlanWithRetriesParams
): Promise<TxPlanResult> => {
  const {txPlanArgs, account, evaluateTxBodyFn, remainingRetries, retryIntervalMillis} = params

  const handleRetry = async (e?: any): Promise<TxPlanResult> => {
    getLogger().warn(
      {error: e},
      `Error evaluating tx plan, ${remainingRetries} remaining retries, retrying in ${retryIntervalMillis} ms`
    )
    await sleep(retryIntervalMillis)
    return getEvaluatedTxPlanWithRetries({
      ...params,
      remainingRetries: remainingRetries - 1,
      retryIntervalMillis: retryIntervalMillis * 2,
    })
  }

  try {
    const res = await getEvaluatedTxPlan({
      txPlanArgs,
      utxos: account.getUtxos(),
      changeAddress: account.getChangeAddress(),
      evaluateTxBodyFn,
    })
    if (res.success) {
      return res
    }
    if (remainingRetries > 0) {
      return handleRetry()
    }
    getLogger().info(`No remaining retries`)
    return res
  } catch (e: any) {
    if (remainingRetries > 0) {
      return handleRetry(e)
    }
    getLogger().info(`No remaining retries`)
    throw e
  }
}
