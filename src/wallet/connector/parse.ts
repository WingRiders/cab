import {BigNumber} from 'bignumber.js'
import {decode, Tagged} from 'borc'
import {isEmpty, isMap} from 'lodash'

import * as api from '@/dappConnector'
import {
  CborHexString,
  PlutusScript,
  TxOutputDatumType,
  TxOutputType,
  TxScriptType,
} from '@/dappConnector'
import {CborizedTxDatum} from '@/ledger/transaction'

import {normalizeDatum} from './normalize'

/* Functions for converting decoded CBOR API objects to JS API objects */

/* either hash or inline */
type DatumOption = [type: 0, hash: Uint8Array] | [type: 1, datum: Tagged<Uint8Array>]
type ScriptRef = Tagged<Uint8Array>
type Script =
  | [type: 0, nativeScript: Uint8Array]
  | [type: 1, plutusV1Script: Uint8Array]
  | [type: 2, plutusv2Script: Uint8Array]

type DecodedUtxo = [
  input: [txHash: Uint8Array, index: Numerical],
  output:
    | [address: Uint8Array, value: DecodedValue, datumHash?: Uint8Array]
    | Map<number, Uint8Array | DecodedValue | DatumOption | ScriptRef>
]

const parseDatumOption = (datumOption: DatumOption | undefined) => {
  if (datumOption === undefined) {
    return {}
  }
  return {
    datumOption:
      datumOption[0] === 0
        ? ({
            type: TxOutputDatumType.HASH,
            datumHash: toHexString(datumOption[1]) as api.Hash32,
          } as const)
        : ({
            type: TxOutputDatumType.INLINED_DATUM,
            datum: normalizeDatum(CborizedTxDatum.decode(Buffer.from(datumOption[1].value))),
          } as const),
  }
}

const parseScriptRef = (decoded: ScriptRef | undefined) => {
  if (decoded === undefined) {
    return {}
  }
  const script = decode(decoded.value) as Script
  return {
    scriptRef: {
      type: script[0] as TxScriptType,
      script: toHexString(script[1]) as PlutusScript,
    },
  }
}

export const parseUtxo = (decoded: DecodedUtxo): api.TxUnspentOutput => {
  const [[txHash, index], output] = decoded
  const txInput = {txHash: toHexString(txHash) as api.TxHash, index: new BigNumber(index) as api.UInt}
  if (isMap(output)) {
    return {
      txInput,
      txOutput: {
        type: TxOutputType.POST_ALONZO,
        address: toHexString(output.get(0) as unknown as Uint8Array) as api.Address,
        value: parseValue(output.get(1) as unknown as DecodedValue),
        ...parseDatumOption(output.get(2) as DatumOption | undefined),
        ...parseScriptRef(output.get(3) as ScriptRef | undefined),
      },
    }
  } else {
    const [address, value, datumHash] = output
    return {
      txInput,
      txOutput: {
        type: TxOutputType.LEGACY,
        address: toHexString(address) as api.Address,
        value: parseValue(value),
        ...(datumHash ? {datumHash: toHexString(datumHash) as api.Hash32} : {}),
      },
    }
  }
}

export const parseCborHexUtxo = (encodedUtxo: CborHexString) => parseUtxo(decode(encodedUtxo))

export const parseVKeyWitnesses = (witnesses: [Uint8Array, Uint8Array][]): api.VKeyWitness[] => {
  return witnesses.map(([publicKey, signature]) => ({
    publicKey: toHexString(publicKey),
    signature: toHexString(signature),
  }))
}

export type Numerical = number | BigNumber
type Bytes = Buffer | Uint8Array
export type DecodedValue = Numerical | [Numerical, Map<Bytes, Map<Bytes, Numerical>>]

export const parseValue = (decoded: DecodedValue): api.Value => {
  const [coins, multiAsset] = Array.isArray(decoded)
    ? isEmpty(decoded[1])
      ? [decoded[0], undefined] // if the asset asset map is empty, ignore it
      : decoded
    : [decoded, undefined]

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
