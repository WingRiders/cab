import {encode} from 'borc'

import {LANGUAGE_TO_TX_SCRIPT_TYPE, TxScript} from '../../../types'

export const encodeTxScript = (script: Pick<TxScript, 'bytes' | 'language'>) => {
  const txScriptType = LANGUAGE_TO_TX_SCRIPT_TYPE[script.language]
  return encode([txScriptType, script.bytes])
}
