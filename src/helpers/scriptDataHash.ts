import {TxAux} from '../ledger/transaction'
import {bech32Encode} from './bech32'

export const getScriptDataHash = (txAux: TxAux) =>
  txAux.scriptIntegrity && bech32Encode('script_data', Buffer.from(txAux.scriptIntegrity, 'hex'))
