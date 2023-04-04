import {Lovelace} from '@/types'

export function sumCoins(inputs: {coins: Lovelace}[]): Lovelace {
  return inputs.reduce((acc, {coins}) => acc.plus(coins), new Lovelace(0)) as Lovelace
}
