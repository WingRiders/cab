import {lovelaceToAda} from '@/helpers'
import {Lovelace, Ada} from '@/types/base'
import {ADA_DECIMALS} from '../../constants'

export const printAda = (coins: Lovelace, precision = ADA_DECIMALS): string => {
  const adaAmount = lovelaceToAda(coins)

  if (precision === 0) {
    return adaAmount.integerValue(Ada.ROUND_FLOOR).toString()
  } else if (precision > 0 && precision <= ADA_DECIMALS) {
    const breakIdx = ADA_DECIMALS + 1
    return adaAmount.toFixed(breakIdx).slice(0, -breakIdx + precision)
  } else {
    return adaAmount.toFixed(precision)
  }
}
