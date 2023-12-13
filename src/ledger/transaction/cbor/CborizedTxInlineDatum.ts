import {encode, Tagged} from 'borc'

import {TxDatum} from '@/types/transaction'

import {CborizedTxDatum} from './CborizedTxDatum'

export class CborizedTxInlineDatum {
  data: TxDatum
  constructor(data: TxDatum) {
    this.data = data
  }

  encodeCBOR(encoder: any) {
    return encoder.pushAny(new Tagged(24, encode(new CborizedTxDatum(this.data)), null))
  }
}
