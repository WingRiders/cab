import {UTxO} from '@/types'

export const isNonScriptUtxo = (utxo: UTxO) => !utxo.hasInlineScript
