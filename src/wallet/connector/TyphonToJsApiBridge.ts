import {decode} from 'borc'

import type {CborAPI} from '@/dappConnector'

import {CborToJsApiBridge} from './CborToJsApiBridge'
import type {Numerical} from './parse'

export class TyphonToJsApiBridge extends CborToJsApiBridge {
  protected override findCollateralGetter(): CborAPI['getCollateral'] {
    const getCollateral = super.findCollateralGetter()

    if (typeof getCollateral !== 'function') return undefined

    return (params) =>
      getCollateral(params)
        .catch((e) =>
          TyphonToJsApiBridge.isGetCollateralArgParseError(e)
            ? getCollateral(TyphonToJsApiBridge.getLegacyGetCollateralArg(params))
            : Promise.reject(e)
        )
        .catch((e) => (TyphonToJsApiBridge.isGetCollateralUtxoNotFoundError(e) ? [] : Promise.reject(e)))
  }

  private static isGetCollateralUtxoNotFoundError(e: any) {
    return e.code === -2 && e.info === 'Collateral utxo not found!'
  }

  private static isGetCollateralArgParseError(e: any) {
    return e.code === -1 && e.info === '"amount" must be a string'
  }

  private static getLegacyGetCollateralArg(params: Parameters<Required<CborAPI>['getCollateral']>[0]) {
    const amount = decode(params.amount) as Numerical
    const legacyAmount: string = amount.toString()
    return legacyAmount as any
  }
}
