import {GenericInput} from '@/types'
import {sortBy} from 'lodash'

export const orderInputs = (inputs: GenericInput[]): GenericInput[] =>
  sortBy(inputs, [({utxo}) => utxo.txHash, ({utxo}) => utxo.outputIndex])
