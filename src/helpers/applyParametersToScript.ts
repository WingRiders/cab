import {applyParamsToScript} from '@wingriders/apply-params-to-script'
import {decode, encode} from 'borc'

import {cborizeTxDatums} from '../ledger/transaction'
import {PLUTUS_SCRIPT_VERSION_TO_LANGUAGE, PlutusScriptVersion, TxDatum} from '../types'
import {getScriptHash} from './scriptHash'

export const applyParametersToScript = async (
  script: {cborHex: string; version: PlutusScriptVersion},
  parameters: TxDatum[]
) => {
  const parametersCBOR = encode(cborizeTxDatums(parameters))
  const parametrizedScript = Buffer.from(
    await applyParamsToScript(parametersCBOR, decode(script.cborHex))
  )

  return {
    hash: getScriptHash(parametrizedScript, script.version),
    bytes: parametrizedScript,
    language: PLUTUS_SCRIPT_VERSION_TO_LANGUAGE[script.version],
  }
}
