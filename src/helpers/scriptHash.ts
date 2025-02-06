import {CREDENTIAL_HASH_SIZE} from '../constants'
import {PLUTUS_SCRIPT_VERSION_PREFIX, PlutusScriptVersion, ScriptHash} from '../types'
import {blake2b} from './blake2b'

export const getScriptHash = (scriptBytes: Buffer, version: PlutusScriptVersion): ScriptHash => {
  const versionPrefix = Buffer.from(PLUTUS_SCRIPT_VERSION_PREFIX[version], 'hex')
  return blake2b(Buffer.concat([versionPrefix, scriptBytes]), CREDENTIAL_HASH_SIZE).toString(
    'hex'
  ) as ScriptHash
}
