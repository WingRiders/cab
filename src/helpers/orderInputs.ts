import {sortBy} from 'lodash'

import {GenericInput} from '@/types'

export const orderInputs = (inputs: GenericInput[]): GenericInput[] =>
  sortBy(inputs, [({utxo}) => utxo.txHash, ({utxo}) => utxo.outputIndex])
