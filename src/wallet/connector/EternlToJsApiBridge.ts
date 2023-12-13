import {hasSpendingScript} from 'cardano-crypto.js'

import {
  AdaAssetName,
  AdaPolicyId,
  CborAPI,
  CborHexString,
  TxUnspentOutput,
  UtxoFilterOptions,
} from '@/dappConnector'
import {cacheResults} from '@/helpers'
import {MIN_RECOMMENDED_COLLATERAL_AMOUNT} from '@/helpers/collaterals'

import {BridgeError} from './BridgeError'
import {CborToJsApiBridge} from './CborToJsApiBridge'
import {parseCborHexUtxo} from './parse'

const ETERNL_MAX_COLLATERAL_AMOUNT = 20_000_000

type EternlCache = {
  getUtxos: Record<string, any>
  getCollateral: Record<string, any>
  getBalance: Record<string, any>
  getUsedAddresses: Record<string, any>
  getUnusedAddresses: Record<string, any>
}

export class EternlToJsApiBridge extends CborToJsApiBridge {
  constructor(protected cborAPI: CborAPI, cache: EternlCache, cacheTtl: number) {
    super(cborAPI)
    // the following is evaluated after the methods are overridden
    this.getUtxos = cacheResults(cacheTtl, cache.getUtxos)(this.getUtxos.bind(this))
    this.getCollateral = cacheResults(cacheTtl, cache.getCollateral)(this.getCollateral.bind(this))
    this.getBalance = cacheResults(cacheTtl, cache.getBalance)(this.getBalance.bind(this))
    this.getUsedAddresses = cacheResults(
      cacheTtl,
      cache.getUsedAddresses
    )(this.getUsedAddresses.bind(this))
    this.getUnusedAddresses = cacheResults(
      cacheTtl,
      cache.getUnusedAddresses
    )(this.getUnusedAddresses.bind(this))
  }

  override async getUtxos(options?: UtxoFilterOptions): Promise<TxUnspentOutput[]> {
    const utxos = (await super.getUtxos(options)) ?? []

    return options?.withoutLocked
      ? utxos
      : // doesn't respect options.amount nor options.paginate
        utxos.concat(await this.getLockedUtxos())
  }

  override async getCollateral(): Promise<TxUnspentOutput[] | undefined> {
    const unlockedCollaterals = await super.getCollateral()
    const api: any = this.cborApi
    if (
      (!unlockedCollaterals || unlockedCollaterals.length === 0) &&
      typeof api.experimental?.getLockedUtxos === 'function'
    ) {
      const lockedUtxos: CborHexString[] = (await api.experimental.getLockedUtxos()) ?? []
      if (!Array.isArray(lockedUtxos)) {
        return []
      }
      const parsedLockedUtxos = lockedUtxos.map(parseCborHexUtxo)
      /**
       * Eternl can use any UTxO with no tokens and a value between 5₳ and 20₳ as collateral.
       * When you activate this setting, it will look for a UTxO that is suitable.
       *
       * The code below mirrors the collateral logic from cab/account/helpers/collaterals,
       * but is more specific to eternl definition (different amounts). Even though eter
       */
      const potentialCollaterals = parsedLockedUtxos.filter((parsedUtxo) => {
        const txOut = parsedUtxo.txOutput
        const adaQuantity = txOut.value.get(AdaPolicyId)?.get(AdaAssetName)

        // ada only needs to be in the utxo, but if there is anything else it should not be used
        if (txOut.value.size > 1 || !adaQuantity) {
          return false
        }

        // check taht ADA value is between recommended and max accepted by eternal
        if (
          adaQuantity.lt(MIN_RECOMMENDED_COLLATERAL_AMOUNT) ||
          adaQuantity.gt(ETERNL_MAX_COLLATERAL_AMOUNT)
        ) {
          return false
        }

        // this is just a sanity check, wallets should not return script utxos
        // if it has datum or if the address is a script
        if (hasSpendingScript(Buffer.from(txOut.address, 'hex'))) {
          return false
        }
        return true
      })
      return potentialCollaterals.length > 0 ? potentialCollaterals : undefined
    } else {
      return unlockedCollaterals
    }
  }

  private async getLockedUtxos(): Promise<TxUnspentOutput[]> {
    const api: any = this.cborApi

    if (typeof api.experimental?.getLockedUtxos === 'function') {
      const lockedUtxos: unknown = await api.experimental.getLockedUtxos()

      if (lockedUtxos != null && !Array.isArray(lockedUtxos)) {
        throw new BridgeError(
          `getLockedUxos returned ${String(lockedUtxos)}, expected array, null or undefined!`
        )
      }
      return (lockedUtxos ?? []).map(parseCborHexUtxo)
    }

    return []
  }

  static createCache(): EternlCache {
    return {
      getUtxos: {},
      getCollateral: {},
      getBalance: {},
      getUsedAddresses: {},
      getUnusedAddresses: {},
    }
  }
}
