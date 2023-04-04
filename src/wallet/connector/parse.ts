import * as api from '@/dappConnector'
import {CborHexString} from '@/dappConnector'
import {BigNumber} from 'bignumber.js'
import {decode} from 'borc'

/* Functions for converting decoded CBOR API objects to JS API objects */

type DecodedUtxo = [
  input: [txHash: Uint8Array, index: Numerical],
  output: [address: Uint8Array, value: DecodedValue, datumHash?: Uint8Array]
]

export const parseUtxo = (decoded: DecodedUtxo): api.TxUnspentOutput => {
  const [[txHash, index], [address, value, datumHash]] = decoded
  return {
    txInput: {txHash: toHexString(txHash) as api.TxHash, index: new BigNumber(index) as api.UInt},
    txOutput: {
      address: toHexString(address) as api.Address,
      value: parseValue(value),
      ...(datumHash ? {datumHash: toHexString(datumHash) as api.Hash32} : {}),
    },
  }
}

export const parseCborHexUtxo = (encodedUtxo: CborHexString) => parseUtxo(decode(encodedUtxo))

export const parseVKeyWitnesses = (witnesses: [Uint8Array, Uint8Array][]): api.VKeyWitness[] => {
  return witnesses.map(([publicKey, signature]) => ({
    publicKey: toHexString(publicKey),
    signature: toHexString(signature),
  }))
}

export const parseBootstrapWitnesses = (
  witnesses: [Uint8Array, Uint8Array, Uint8Array, Uint8Array][]
): api.BootstrapWitness[] => {
  return witnesses.map(([publicKey, signature, chainCode, attributes]) => ({
    publicKey: toHexString(publicKey),
    signature: toHexString(signature),
    chainCode: toHexString(chainCode),
    addressAttributes: toHexString(attributes),
  }))
}

type Numerical = number | BigNumber
type Bytes = Buffer | Uint8Array
export type DecodedValue = Numerical | [Numerical, Map<Bytes, Map<Bytes, Numerical>>]

export const parseValue = (decoded: DecodedValue): api.Value => {
  const [coins, multiAsset] = Array.isArray(decoded) ? decoded : [decoded, undefined]

  const value: api.Value = new Map()
  value.set(api.AdaPolicyId, new Map([[api.AdaAssetName, new BigNumber(coins) as api.UInt]]))

  if (multiAsset) {
    multiAsset.forEach((assets, policyId) => {
      const parsedAssets: Map<api.AssetName, api.UInt> = new Map()
      assets.forEach((quantity, assetName) => {
        parsedAssets.set(toHexString(assetName) as api.AssetName, new BigNumber(quantity) as api.UInt)
      })
      value.set(Buffer.from(policyId).toString('hex') as api.PolicyId, parsedAssets)
    })
  }

  return value
}

const toHexString = (value: Buffer | Uint8Array | string) =>
  Buffer.from(value).toString('hex') as api.HexString
