import {ExecutionUnits} from '@cardano-ogmios/schema'
import {BigNumber} from 'bignumber.js'
import {sortBy} from 'lodash'

import * as api from '@/dappConnector'
import {UnexpectedError, UnexpectedErrorReason} from '@/errors'
import {optionalFields} from '@/helpers'
import {encodeAddress} from '@/ledger/address'
import {valueAdd, valueToLovelace, valueToTokenBundle} from '@/ledger/assets'
import {ShelleyTxAux, TxAux} from '@/ledger/transaction'
import {ARRAY_ENCODING, toType} from '@/ledger/transaction/cbor/cborTypes'
import * as cab from '@/types'
import {TxMintRedeemer, TxRedeemer, TxSpendRedeemer} from '@/types/transaction'

export function reverseAddress(address: api.Address): cab.Address {
  return encodeAddress(Buffer.from(address, 'hex'))
}

export function reverseInputs(inputs: api.TxInput[], utxos: cab.UTxO[]): cab.TxInput[] {
  return inputs.map((input) => {
    const utxo = utxos.find(
      (utxo: cab.UTxO) => utxo.txHash === input.txHash && input.index.eq(utxo.outputIndex)
    )
    if (utxo) {
      return utxo
    } else {
      return {
        address: '' as cab.Address,
        coins: new cab.Lovelace(0) as cab.Lovelace,
        outputIndex: input.index.toNumber(),
        tokenBundle: [],
        txHash: input.txHash as cab.HexString,
      }
    }
  })
}

export function reverseReferenceInputs(inputs: api.TxInput[]): cab.TxInputRef[] {
  return inputs.map((input) => ({
    outputIndex: input.index.toNumber(),
    txHash: input.txHash as cab.HexString,
  }))
}

/**
 * Intentionally left as generic strings, so they can be re-typed
 */
export function flattenValue(valueMap: api.Value | api.MintValue): [string, string, string][] {
  const flatValue: [string, string, string][] = []
  valueMap.forEach((assets, policyId: api.PolicyId) =>
    assets.forEach((quantity: api.UInt | api.Int32, assetName: api.AssetName) => {
      flatValue.push([policyId, assetName, quantity.toString()])
    })
  )
  return flatValue
}

export function reverseValue(valueMap: api.Value | api.MintValue): cab.Value {
  let value: cab.Value = {}
  valueMap.forEach((assetMap, policyId) =>
    assetMap.forEach((quantity, assetName) => {
      value = valueAdd(value, {[policyId]: {[assetName]: quantity}})
    })
  )
  return value
}

function reverseOutputs(outputs: api.TxOutput[]): cab.TxOutput[] {
  return outputs.map((output): cab.TxOutput => {
    const value = reverseValue(output.value)
    if (output.type === api.TxOutputType.LEGACY) {
      return {
        type: cab.TxOutputType.LEGACY,
        address: reverseAddress(output.address),
        coins: valueToLovelace(value),
        isChange: false,
        tokenBundle: valueToTokenBundle(value),
        datumHash: output.datumHash,
      }
    } else {
      return {
        type: cab.TxOutputType.POST_ALONZO,
        address: reverseAddress(output.address),
        coins: valueToLovelace(value),
        isChange: false,
        tokenBundle: valueToTokenBundle(value),
        ...(output.scriptRef && output.scriptRef.type !== api.TxScriptType.NATIVE
          ? {
              scriptRef: reverseScriptRef(output.scriptRef),
            }
          : undefined),
        datumOption: reverseDatumOption(output.datumOption),
      }
    }
  })
}

export function reverseUtxo(
  utxo: api.TxUnspentOutput,
  datumMap?: Map<cab.HexString, cab.TxDatum>
): cab.UTxO {
  const value = reverseValue(utxo.txOutput.value)
  return {
    address: reverseAddress(utxo.txOutput.address),
    outputIndex: utxo.txInput.index.toNumber(),
    coins: valueToLovelace(value),
    tokenBundle: valueToTokenBundle(value),
    txHash: utxo.txInput.txHash,
    ...optionalFields(
      utxo.txOutput.type === api.TxOutputType.POST_ALONZO
        ? {
            inlineDatum: utxo.txOutput.datumOption?.type === api.TxOutputDatumType.INLINED_DATUM,
            inlineScript: utxo.txOutput.scriptRef
              ? reverseScriptRef(utxo.txOutput.scriptRef)
              : undefined,
            ...(utxo.txOutput.datumOption?.type === api.TxOutputDatumType.INLINED_DATUM
              ? {
                  datum: reverseDatum(utxo.txOutput.datumOption.datum),
                }
              : {
                  datumHash: utxo.txOutput.datumOption?.datumHash,
                  datum:
                    utxo.txOutput.datumOption?.datumHash !== undefined
                      ? datumMap?.get(utxo.txOutput.datumOption.datumHash)
                      : undefined,
                }),
          }
        : {
            datumHash: utxo.txOutput.datumHash,
            datum:
              utxo.txOutput.datumHash !== undefined ? datumMap?.get(utxo.txOutput.datumHash) : undefined,
          }
    ),
  }
}

export function reverseUtxos(
  utxos?: api.TxUnspentOutput[],
  datumMap?: Map<cab.HexString, cab.TxDatum>
): cab.UTxO[] {
  return utxos?.map((utxo) => reverseUtxo(utxo, datumMap)) ?? []
}

export function reverseDatumOption(
  datumOption: api.TxOutputPostAlonzo['datumOption']
): cab.TxDatumOption | undefined {
  if (!datumOption) {
    return undefined
  }

  return datumOption.type === api.TxOutputDatumType.HASH
    ? {
        type: cab.TxDatumOptionType.HASH,
        hash: datumOption.datumHash,
      }
    : {
        type: cab.TxDatumOptionType.INLINED_DATUM,
        datum: reverseDatum(datumOption.datum),
      }
}

export function reverseDatum(datum: api.PlutusDatum): cab.TxDatum {
  const type = toType(datum)
  switch (type) {
    case 'String':
      return datum as string
    case 'Number':
      return datum as number
    case 'Map':
      return new Map<cab.TxDatum, cab.TxDatum>(
        Array.from(datum as Map<api.PlutusDatum, api.PlutusDatum>).map(([key, value]) => [
          reverseDatum(key),
          reverseDatum(value),
        ])
      )
    case 'Array':
      return (datum as Array<api.PlutusDatum>).map(reverseDatum)
    default: {
      if (BigNumber.isBigNumber(datum)) {
        return datum
      } else if (Buffer.isBuffer(datum)) {
        return datum
      } else if ((datum as api.Bytes).__typeBytes) {
        return Buffer.from((datum as api.Bytes).bytes, 'hex')
      } else if ((datum as api.PlutusDatumConstr).__typeConstr) {
        const constrDatum = datum as api.PlutusDatumConstr
        return {
          i: constrDatum.i,
          data: constrDatum.data.map(reverseDatum),
          __typeConstr: true,
          __cborArrayEncoding: ARRAY_ENCODING.ZERO_LENGTH_FOR_EMPTY_FOR_OTHER_INDEFINITE,
        }
      } else if ((datum as api.PlutusSimpleDatum).__simpleDatum) {
        const simpleDatum = datum as api.PlutusSimpleDatum
        return {
          data: reverseDatum(simpleDatum.data),
          __simpleDatum: true,
        }
      } else {
        throw new UnexpectedError(UnexpectedErrorReason.UnsupportedOperationError)
      }
    }
  }
}

function reverseDatums(datums: api.PlutusDatum[]): cab.TxDatum[] {
  return datums.map(reverseDatum)
}

function reverseExUnits(exUnits: api.ExUnits): ExecutionUnits {
  return {
    memory: exUnits.mem.toNumber(),
    cpu: exUnits.cpu.toNumber(),
  }
}

function reverseSpendRedeemer(redeemer: api.Redeemer, orderedInputs: cab.UTxO[]): TxSpendRedeemer {
  const inputIndex = redeemer.index.toNumber()
  return {
    data: reverseDatum(redeemer.data),
    exUnits: reverseExUnits(redeemer.exUnits),
    ref: {
      txHash: orderedInputs[inputIndex].txHash,
      outputIndex: orderedInputs[inputIndex].outputIndex,
    },
    tag: cab.TxRedeemerTag.SPEND,
  }
}

function reverseMintRedeemer(redeemer: api.Redeemer, mint: api.MintValue): TxMintRedeemer {
  const mintPolicy = Array.from(mint.keys()).sort()[redeemer.index.toNumber()]
  return {
    data: reverseDatum(redeemer.data),
    exUnits: reverseExUnits(redeemer.exUnits),
    ref: {
      policyId: mintPolicy,
    },
    tag: cab.TxRedeemerTag.MINT,
  }
}

function reverseRedeemers(
  redeemers: api.Redeemer[],
  inputs: cab.UTxO[],
  mint?: api.MintValue
): TxRedeemer[] {
  const orderedInputs = sortBy(inputs, ['txHash', 'outputIndex'])
  return redeemers.map((redeemer) => {
    switch (redeemer.tag) {
      case api.RedeemerTag.Spend:
        return reverseSpendRedeemer(redeemer, orderedInputs)
      case api.RedeemerTag.Mint: {
        if (!mint) {
          throw new UnexpectedError(UnexpectedErrorReason.UnsupportedOperationError)
        }
        return reverseMintRedeemer(redeemer, mint)
      }
      default:
        throw new UnexpectedError(UnexpectedErrorReason.UnsupportedOperationError)
    }
  })
}

function reverseScriptRef(scriptRef: api.TxScriptRef): cab.TxScript {
  if (scriptRef.type === api.TxScriptType.NATIVE) {
    throw new UnexpectedError(UnexpectedErrorReason.UnsupportedOperationError)
  }
  return reverseScript(
    scriptRef.script,
    scriptRef.type === api.TxScriptType.PLUTUS_V1 ? cab.Language.PLUTUSV1 : cab.Language.PLUTUSV2
  )
}

function reverseScript(script: api.PlutusScript, language: cab.Language): cab.TxScript {
  return {
    language,
    bytes: Buffer.from(script, 'hex'),
  }
}

function reverseScripts(scripts: api.PlutusScript[], language: cab.Language): cab.TxScript[] {
  return scripts.map((script) => reverseScript(script, language))
}

function reverseWithdrawal(withdrawal: [api.Address, api.Coin]): cab.TxWithdrawal {
  return {
    stakingAddress: reverseAddress(withdrawal[0]),
    rewards: new BigNumber(withdrawal[1]) as cab.Lovelace,
  }
}

function reverseWithdrawals(withdrawals: api.Withdrawals): cab.TxWithdrawal[] {
  return Array.from(withdrawals).map(reverseWithdrawal)
}

export function reverseTx(tx: api.Transaction, utxos: cab.UTxO[]): TxAux {
  const inputs = reverseInputs(Array.from(tx.body.inputs), utxos)
  const collateralInputs = tx.body.collateralInputs
    ? reverseInputs(Array.from(tx.body.collateralInputs), utxos)
    : undefined
  return new ShelleyTxAux({
    inputs,
    referenceInputs: tx.body.referenceInputs
      ? reverseReferenceInputs(Array.from(tx.body.referenceInputs))
      : undefined,
    outputs: reverseOutputs(tx.body.outputs),
    fee: new cab.BigNumber(tx.body.fee) as cab.Lovelace,
    ttl: tx.body.ttl?.toNumber() || null,
    certificates: tx.body.certificates || [],
    withdrawals: tx.body.withdrawals ? reverseWithdrawals(tx.body.withdrawals) : [],
    auxiliaryDataHash: tx.body.auxiliaryDataHash || '',
    validityIntervalStart: tx.body.validityStart?.toNumber() || null,
    ...optionalFields({
      mint: tx.body.mint ? valueToTokenBundle(reverseValue(tx.body.mint)) : undefined,
      collateralInputs,
      requiredSigners: tx.body.requiredSigners
        ? (Array.from(tx.body.requiredSigners) as unknown as cab.PubKeyHash[])
        : undefined,
      networkId: tx.body.networkId ? (tx.body.networkId as unknown as cab.NetworkId) : undefined,
      datums: tx.witnessSet.plutusDatums ? reverseDatums(tx.witnessSet.plutusDatums) : undefined,
      redeemers: tx.witnessSet.redeemers
        ? reverseRedeemers(tx.witnessSet.redeemers, inputs, tx.body.mint)
        : undefined,
      scripts:
        tx.witnessSet.plutusV1Scripts || tx.witnessSet.plutusV2Scripts
          ? reverseScripts(tx.witnessSet.plutusV1Scripts || [], cab.Language.PLUTUSV1).concat(
              reverseScripts(tx.witnessSet.plutusV2Scripts || [], cab.Language.PLUTUSV2)
            )
          : undefined,
      scriptIntegrity: tx.body.scriptDataHash,
      // TODO for now compatible as we are using simple metadata
      metadata: tx.auxiliaryData as unknown as cab.TxMetadata,
    }),
  })
}

export function reverseVKeyWitnesses(vKeyWitnesses: api.VKeyWitness[]): cab.TxShelleyWitness[] {
  return vKeyWitnesses.map((witness) => ({
    publicKey: Buffer.from(witness.publicKey, 'hex'),
    signature: Buffer.from(witness.signature, 'hex'),
  }))
}
