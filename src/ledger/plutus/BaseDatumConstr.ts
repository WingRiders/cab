import {TxDatum, TxDatumConstr} from '@/types/transaction'

export class BaseDatumConstr implements TxDatumConstr {
  __typeConstr: any
  i: number
  data: TxDatum[]

  constructor(index: number, data: TxDatum[]) {
    this.__typeConstr = true
    this.i = index
    this.data = data
  }
}
