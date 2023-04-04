import {HexString} from '@/types/base'
import {packEnterpriseAddress} from 'cardano-crypto.js'
import {encodeAddress} from './addressHelpers'

export function scriptHashToEnterpriseAddress(hash: HexString, networkId: number) {
  const address = packEnterpriseAddress(Buffer.from(hash, 'hex'), networkId, true)
  return encodeAddress(address)
}
