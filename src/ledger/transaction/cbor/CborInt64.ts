import {BigNumber} from 'bignumber.js'

import {MAX_INT64, MIN_INT64} from '@/constants'
import {CabInternalError, CabInternalErrorReason} from '@/errors'

import {MT, NUMBYTES} from './cborTypes'

export class CborInt64 {
  public bigNumber: BigNumber
  constructor(public number: BigNumber.Value) {
    this.bigNumber = new BigNumber(number)
  }

  encodeCBOR(encoder: any) {
    if (this.bigNumber.absoluteValue().isLessThan(Number.MAX_SAFE_INTEGER)) {
      return encoder._pushIntNum(this.bigNumber.integerValue(BigNumber.ROUND_FLOOR).toNumber())
    } else if (this.bigNumber.lte(MAX_INT64) && this.bigNumber.gte(MIN_INT64)) {
      const m = (this.bigNumber.isPositive() ? MT.POS_INT : MT.NEG_INT) << 5
      const obj = this.bigNumber.isPositive() ? this.bigNumber : this.bigNumber.negated().minus(1)
      const shift32 = new BigNumber(2).exponentiatedBy(32)
      return (
        encoder._pushUInt8(m | NUMBYTES.EIGHT) &&
        encoder._pushUInt32BE(obj.idiv(shift32).toNumber()) &&
        encoder._pushUInt32BE(obj.mod(shift32).toNumber())
      )
    } else {
      throw new CabInternalError(CabInternalErrorReason.NumberTooBig)
    }
  }
}
