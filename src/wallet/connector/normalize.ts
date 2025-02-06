import {ExecutionUnits} from '@cardano-ogmios/schema'
import {BigNumber} from 'bignumber.js'
import {compact, findIndex, keys, sortBy, uniq} from 'lodash'

import {AddressWithMeta} from '@/account'
import * as api from '@/dappConnector'
import {UnexpectedError, UnexpectedErrorReason} from '@/errors'
import {isAda, optionalFields} from '@/helpers'
import {addressToHex} from '@/ledger/address'
import {orderTokenBundle} from '@/ledger/assets'
import {hashDatum, matchTxInputRef, TxAux} from '@/ledger/transaction'
import {toType} from '@/ledger/transaction/cbor/cborTypes'
import * as cab from '@/types'

export function normalizeValue<T extends BigNumber>(
  value: cab.Value,
  withoutAda: boolean = false
): Map<api.PolicyId, Map<api.AssetName, T>> {
  const apiValue = new Map<api.PolicyId, Map<api.AssetName, T>>()

  keys(value)
    .sort()
    .forEach((policyId) => {
      if (value[policyId]) {
        const assetToQuantityMap = new Map<api.AssetName, T>()
        keys(value[policyId])
          .sort()
          .forEach((assetName) => {
            if (value[policyId][assetName] && !(withoutAda && isAda({policyId, assetName}))) {
              assetToQuantityMap.set(
                assetName as api.AssetName,
                new BigNumber(value[policyId][assetName]) as T
              )
            }
          })
        if (assetToQuantityMap.size) {
          apiValue.set(policyId as api.PolicyId, assetToQuantityMap)
        }
      }
    })

  return apiValue
}

export function normalizeTxValue<T>(
  tokenBundle: cab.TokenBundle,
  coins?: cab.Lovelace,
  allowNegative = false
): Map<api.PolicyId, Map<api.AssetName, T>> {
  const value = new Map<api.PolicyId, Map<api.AssetName, T>>()

  if (coins && coins.gt(0)) {
    value.set(api.AdaPolicyId, new Map([[api.AdaAssetName, coins as unknown as T]]))
  }

  const orderedTokenBundle = orderTokenBundle(tokenBundle)

  orderedTokenBundle.forEach(({policyId, assets}) => {
    const assetToQuantityMap = new Map<api.AssetName, T>()

    assets.forEach(({assetName, quantity}) => {
      if (allowNegative ? !quantity.isZero() : quantity.gt(0)) {
        assetToQuantityMap.set(assetName as api.AssetName, quantity as unknown as T)
      }
    })

    value.set(policyId as api.PolicyId, assetToQuantityMap)
  })

  return value
}

export function normalizeTxInput(txInput: Pick<cab.TxInput, 'txHash' | 'outputIndex'>): api.TxInput {
  return {
    txHash: txInput.txHash as api.TxHash,
    index: new BigNumber(txInput.outputIndex) as api.UInt,
  }
}

function normalizeScriptLanguage(scriptLanguage: cab.Language): api.TxScriptType {
  switch (scriptLanguage) {
    case cab.Language.PLUTUSV1:
      return api.TxScriptType.PLUTUS_V1
    case cab.Language.PLUTUSV2:
      return api.TxScriptType.PLUTUS_V2
    default:
      throw new Error(`Unknown script language: ${scriptLanguage}`)
  }
}

function normalizeTxScript(txScript: cab.TxScript): api.TxScriptRef {
  return {
    script: txScript.bytes.toString('hex') as api.PlutusScript,
    type: normalizeScriptLanguage(txScript.language),
  }
}

function normalizeTxOutput(txOutput: cab.TxOutput): api.TxOutput {
  const {address, coins, tokenBundle} = txOutput

  if (txOutput.type === cab.TxOutputType.LEGACY) {
    return {
      type: api.TxOutputType.LEGACY,
      address: addressToHex(address) as api.Address,
      value: normalizeTxValue(tokenBundle, coins),
      datumHash: txOutput.datumHash !== undefined ? (txOutput.datumHash as api.Hash32) : undefined,
    }
  } else {
    return {
      type: api.TxOutputType.POST_ALONZO,
      address: addressToHex(address) as api.Address,
      value: normalizeTxValue(tokenBundle, coins),
      datumOption: txOutput.datumOption as api.TxOutputPostAlonzo['datumOption'],
      scriptRef: txOutput.scriptRef ? normalizeTxScript(txOutput.scriptRef) : undefined,
    }
  }
}

export function normalizeUtxo(utxo: cab.UTxO): api.TxUnspentOutput {
  const useNewTxFormat = utxo.inlineDatum || utxo.inlineDatum
  const datumHash = utxo.datumHash || (utxo.datum ? (hashDatum(utxo.datum) as api.Hash32) : undefined)
  return {
    txInput: normalizeTxInput(utxo),
    txOutput: normalizeTxOutput({
      ...(useNewTxFormat
        ? {
            type: cab.TxOutputType.POST_ALONZO,
            datumOption:
              utxo.datum && utxo.inlineDatum
                ? {
                    type: cab.TxDatumOptionType.INLINED_DATUM,
                    datum: utxo.datum,
                  }
                : datumHash
                ? {
                    type: cab.TxDatumOptionType.HASH,
                    hash: datumHash,
                  }
                : undefined,
          }
        : {
            type: cab.TxOutputType.LEGACY,
            datumHash,
          }),
      isChange: false,
      address: utxo.address,
      coins: utxo.coins,
      tokenBundle: utxo.tokenBundle,
    }),
  }
}

export function normalizeAddress(address: cab.Address): api.Address {
  return addressToHex(address) as api.Address
}

export function normalizeAddressWithMeta(addressWithMeta: AddressWithMeta): api.Address {
  return normalizeAddress(addressWithMeta.address)
}

export function normalizeDatum(datum: cab.TxDatum): api.PlutusDatum {
  const type = toType(datum)
  switch (type) {
    case 'String':
      return datum as string
    case 'Number':
      return datum as number
    case 'Map':
      return new Map<api.PlutusDatum, api.PlutusDatum>(
        Array.from(datum as Map<cab.TxDatum, cab.TxDatum>).map(([key, value]) => [
          normalizeDatum(key),
          normalizeDatum(value),
        ])
      )
    case 'Array':
      return (datum as Array<cab.TxDatum>).map(normalizeDatum)
    default: {
      if (BigNumber.isBigNumber(datum)) {
        return datum
      } else if (Buffer.isBuffer(datum)) {
        const bytes: api.Bytes = {
          bytes: datum.toString('hex') as api.HexString,
          __typeBytes: true,
        }
        return bytes
      } else if ((datum as cab.TxDatumConstr).__typeConstr) {
        const constrDatum = datum as cab.TxDatumConstr
        return {
          i: constrDatum.i,
          data: constrDatum.data.map(normalizeDatum),
          __typeConstr: true,
        }
      } else if ((datum as cab.TxSimpleDatum).__simpleDatum) {
        const simpleDatum = datum as cab.TxSimpleDatum
        return {
          data: normalizeDatum(simpleDatum),
          __simpleDatum: true,
        }
      } else {
        throw new UnexpectedError(UnexpectedErrorReason.UnsupportedOperationError)
      }
    }
  }
}

export function normalizeExUnits(exUnits: ExecutionUnits): api.ExUnits {
  return {
    mem: new BigNumber(exUnits.memory) as api.UInt,
    cpu: new BigNumber(exUnits.cpu) as api.UInt,
  }
}

export function normalizeWitnessSet(witnessSet: cab.TxWitnessSet, txAux: TxAux): api.TxWitnessSet {
  const orderedInputs = sortBy(txAux.inputs, ['txHash', 'outputIndex'])
  const orderedPolicies = uniq((txAux.mint || []).map((token) => token.policyId)).sort()
  return {
    vKeyWitnesses: witnessSet.vKeyWitnesses?.map(({publicKey, signature}) => ({
      publicKey: publicKey.toString('hex') as api.HexString,
      signature: signature.toString('hex') as api.HexString,
    })),

    plutusV1Scripts: compact(
      witnessSet.plutusScripts
        ?.filter((script) => script.language === cab.Language.PLUTUSV1)
        .map((script) =>
          script.isReferenceScript ? undefined : (script.bytes.toString('hex') as api.PlutusScript)
        )
    ),
    plutusV2Scripts: compact(
      witnessSet.plutusScripts
        ?.filter((script) => script.language === cab.Language.PLUTUSV2)
        .map((script) =>
          script.isReferenceScript ? undefined : (script.bytes.toString('hex') as api.PlutusScript)
        )
    ),

    plutusDatums: witnessSet.plutusDatums?.map((datum) => normalizeDatum(datum)),

    redeemers: witnessSet.redeemers?.map((redeemer) => {
      const base: Omit<api.Redeemer, 'index'> = {
        data: normalizeDatum(redeemer.data),
        tag: redeemer.tag as unknown as api.RedeemerTag,
        exUnits: normalizeExUnits(redeemer.exUnits),
      }
      let index: number
      switch (redeemer.tag) {
        case cab.TxRedeemerTag.SPEND:
          index = findIndex(orderedInputs, matchTxInputRef(redeemer.ref))
          break
        case cab.TxRedeemerTag.MINT:
          index = findIndex(orderedPolicies, (policyId) => policyId === redeemer.ref.policyId)
          break
        default:
          index = redeemer.index
      }
      return {...base, index: new BigNumber(index) as api.UInt}
    }),
  }
}

function normalizeCertificate(_certificate: cab.TxCertificate): api.Certificate {
  throw new Error('Not supported')
}

function normalizeCertificates(certificates: cab.TxCertificate[]): api.Certificate[] {
  return certificates.map(normalizeCertificate)
}

function normalizeWithdrawals(withdrawals: cab.TxWithdrawal[]): api.Withdrawals {
  return new Map(
    withdrawals.map(({stakingAddress, rewards}) => [
      addressToHex(stakingAddress) as api.Address,
      new BigNumber(rewards) as api.Coin,
    ])
  )
}

export function normalizeTx(txAux: TxAux, witnessSet: cab.TxWitnessSet): api.Transaction {
  return {
    body: {
      inputs: new Set(sortBy(txAux.inputs.map(normalizeTxInput), ['txHash', 'index'])),
      referenceInputs: new Set(
        sortBy(txAux.referenceInputs?.map(normalizeTxInput), ['txHash', 'index'])
      ),
      outputs: txAux.outputs.map(normalizeTxOutput),
      fee: txAux.fee as unknown as api.Coin,
      ...optionalFields({
        ttl: txAux.ttl ? (new BigNumber(txAux.ttl) as api.UInt) : undefined,
        validityStart: txAux.validityIntervalStart
          ? (new BigNumber(txAux.validityIntervalStart) as api.UInt)
          : undefined,
        certificates: txAux.certificates ? normalizeCertificates(txAux.certificates) : undefined,
        withdrawals: txAux.withdrawals ? normalizeWithdrawals(txAux.withdrawals) : undefined,
        auxiliaryDataHash: txAux.auxiliaryDataHash ? (txAux.auxiliaryDataHash as api.Hash32) : undefined,
        mint: txAux.mint ? normalizeTxValue(txAux.mint, undefined, true) : undefined,
        scriptDataHash: txAux.scriptIntegrity as api.Hash32,
        collateralInputs: txAux.collateralInputs
          ? new Set(txAux.collateralInputs.map(normalizeTxInput))
          : undefined,
        requiredSigners: txAux.requiredSigners
          ? new Set(txAux.requiredSigners as unknown as api.AddressKeyHash[])
          : undefined,
        networkId:
          typeof txAux.networkId !== 'undefined'
            ? (txAux.networkId as number as api.NetworkId)
            : undefined,
      }),
    },
    isValid: true,
    witnessSet: normalizeWitnessSet(witnessSet, txAux),
    auxiliaryData: txAux.metadata as unknown as api.AuxiliaryData,
  }
}
