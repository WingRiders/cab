import {TxOutputId} from '@/types/transaction'

export function utxoId(utxo: {txHash: string; outputIndex: number}): TxOutputId {
  return `${utxo.txHash}#${utxo.outputIndex}` as TxOutputId
}
