import {BigNumber} from '@/types'
import isNumber from 'lodash/isNumber'

export function fromFraction(fraction: string | number): BigNumber {
  if (isNumber(fraction)) {
    return new BigNumber(fraction)
  }
  const fractionArr = fraction.split('/')
  if (fractionArr.length !== 2) {
    return new BigNumber(NaN)
  }
  return new BigNumber(fractionArr[0]).div(fractionArr[1])
}
