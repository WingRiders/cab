import {Tagged} from 'borc'

import {TxScript} from '@/types/transaction'

import {encodeTxScript} from './utils'

export class CborizedTxScriptRef {
  script: TxScript
  constructor(script: TxScript) {
    this.script = script
  }

  encodeCBOR(encoder: any) {
    return encoder.pushAny(new Tagged(24, encodeTxScript(this.script), null))
  }
}
