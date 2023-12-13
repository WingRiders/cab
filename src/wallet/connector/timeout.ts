import type {JsAPI} from '@/dappConnector'

import {AsyncTrap, trapMethods} from './trap'

type TimeoutConfig = {
  millis: number
  createError: () => string | Error
}

const withTimeout = <T extends Promise<unknown>>(
  promise: T | (() => T),
  {millis, createError}: TimeoutConfig
): Promise<T> =>
  Promise.race([
    typeof promise === 'function' ? promise() : promise,
    new Promise<T>((_, rej) => setTimeout(() => rej(createError()), millis)),
  ])

export type PreTimeout = {delayMs: number; callback: () => void}

type TimeoutTrapOptions = {
  millis: number
  preTimeouts?: PreTimeout[]
}

const timeoutTrap =
  ({millis, preTimeouts = []}: TimeoutTrapOptions): AsyncTrap =>
  async (args, invoke, {methodName}) => {
    const timeoutErrorObj = Error(`Timed out calling ${String(methodName)} after ${millis}ms.`)

    let arePreTimeoutsEnabled = true
    schedulePreTimeouts(preTimeouts, () => arePreTimeoutsEnabled)

    try {
      return await withTimeout(invoke(...args), {millis, createError: () => timeoutErrorObj})
    } catch (e) {
      if (e !== timeoutErrorObj) throw e
    } finally {
      arePreTimeoutsEnabled = false
    }

    throw Error(timeoutErrorObj.message)
  }

type AddTimeoutsOptions = {
  timeoutMs: number
  preTimeouts?: PreTimeout[]
}

export function addTimeouts(api: JsAPI, {timeoutMs, preTimeouts}: AddTimeoutsOptions): JsAPI {
  const timeout = timeoutTrap({millis: timeoutMs, preTimeouts})

  return trapMethods(api, {
    getBalance: timeout,
    getChangeAddress: timeout,
    getCollateral: timeout,
    getUtxos: timeout,
    getNetworkId: timeout,
    getRewardAddresses: timeout,
    getUnusedAddresses: timeout,
    getUsedAddresses: timeout,
  })
}

const schedulePreTimeouts = (preTimeouts: PreTimeout[], shouldKeepExecuting: () => boolean) => {
  for (const {delayMs, callback} of preTimeouts) {
    setTimeout(() => shouldKeepExecuting() && callback(), delayMs)
  }
}
