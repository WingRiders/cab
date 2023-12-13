import {BigNumber} from 'bignumber.js'

import {Ada, Lovelace} from '@/types/base'

import {ADA_DECIMALS} from '../constants'

const LOVELACES_IN_ADA = 10 ** ADA_DECIMALS

// Both converters aim to preserve input type
// i.e. number -> number, BigNumber -> BigNumber, Ada <-> Lovelace
// A better fix would be to never use regular "number"s and
//   migrate codebase to BigNumbers (Lovelaces/Ada)
type AdaToLovelaceReturn<T extends Ada | number | BigNumber> = T extends Ada
  ? Lovelace
  : T extends BigNumber
  ? BigNumber
  : number
const adaToLovelace = <T extends Ada | number | BigNumber>(value: T): AdaToLovelaceReturn<T> =>
  (typeof value !== 'number'
    ? value.times(LOVELACES_IN_ADA)
    : value * LOVELACES_IN_ADA) as AdaToLovelaceReturn<T>

type LovelaceToAdaReturn<T extends Lovelace | number | BigNumber> = T extends Lovelace
  ? Ada
  : T extends BigNumber
  ? BigNumber
  : number
const lovelaceToAda = <T extends Lovelace | number | BigNumber>(value: T): LovelaceToAdaReturn<T> =>
  (typeof value !== 'number'
    ? value.div(LOVELACES_IN_ADA)
    : value / LOVELACES_IN_ADA) as LovelaceToAdaReturn<T>

export {adaToLovelace, lovelaceToAda}
