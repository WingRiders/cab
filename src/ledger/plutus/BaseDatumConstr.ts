import {TxDatum, TxDatumConstr, TxSimpleDatum} from '@/types/transaction'

import {ARRAY_ENCODING} from '../transaction/cbor/cborTypes'

export class BaseDatumConstr implements TxDatumConstr {
  __typeConstr: any
  __cborArrayEncoding: ARRAY_ENCODING
  i: number
  data: TxDatum[]

  constructor(
    index: number,
    data: TxDatum[],
    cborArrayEncoding: ARRAY_ENCODING = ARRAY_ENCODING.ZERO_LENGTH_FOR_EMPTY_FOR_OTHER_INDEFINITE
  ) {
    this.__typeConstr = true
    this.__cborArrayEncoding = cborArrayEncoding
    this.i = index
    this.data = data
  }
}

export class SimpleDatum implements TxSimpleDatum {
  __simpleDatum = true
  data: TxDatum

  constructor(data: TxDatum) {
    this.data = data
  }
}
