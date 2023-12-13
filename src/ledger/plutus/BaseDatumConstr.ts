import {TxDatum, TxDatumConstr, TxSimpleDatum} from '@/types/transaction'

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

export class SimpleDatum implements TxSimpleDatum {
  __simpleDatum = true
  data: TxDatum

  constructor(data: TxDatum) {
    this.data = data
  }
}
