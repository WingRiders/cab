import {decode} from 'borc'

import type {CborAPI} from '@/dappConnector'

import {CborToJsApiBridge} from './CborToJsApiBridge'
import type {Numerical} from './parse'

export class YoroiToJsApiBridge extends CborToJsApiBridge {
  protected override findCollateralGetter(): CborAPI['getCollateral'] {
    const getCollateral = super.findCollateralGetter()

    if (typeof getCollateral !== 'function') return undefined

    return (params) =>
      getCollateral(params).catch((e) =>
        YoroiToJsApiBridge.isGetCollateralArgParseError(e)
          ? getCollateral(YoroiToJsApiBridge.getLegacyGetCollateralArg(params))
          : Promise.reject(e)
      )
  }

  private static isGetCollateralArgParseError(e: any) {
    return String(e.info).toLowerCase().includes('failed to parse the required collateral amount')
  }

  private static getLegacyGetCollateralArg(params: Parameters<Required<CborAPI>['getCollateral']>[0]) {
    const amount = decode(params.amount) as Numerical
    const legacyAmount: number = typeof amount === 'number' ? amount : amount.toNumber()
    return legacyAmount as any
  }
}
