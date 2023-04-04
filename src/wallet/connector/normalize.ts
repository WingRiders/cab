import {findIndex, keys, sortBy, uniq} from 'lodash'
import {addressToHex} from '@/ledger/address'
import {hashDatum, TxAux} from '@/ledger/transaction'
import {BigNumber} from 'bignumber.js'
import {orderTokenBundle} from '@/ledger/assets'
import * as api from '@/dappConnector'
import * as cab from '@/types'
import {AddressWithMeta} from '@/types/wallet'
import {toType} from '@/ledger/transaction/cbor/cborTypes'
import {UnexpectedError, UnexpectedErrorReason} from '@/errors'
import {isAda, optionalFields} from '@/helpers'

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
  coins?: cab.Lovelace
): Map<api.PolicyId, Map<api.AssetName, T>> {
  const value = new Map<api.PolicyId, Map<api.AssetName, T>>()

  if (coins && coins.gt(0)) {
    value.set(api.AdaPolicyId, new Map([[api.AdaAssetName, coins as unknown as T]]))
  }

  const orderedTokenBundle = orderTokenBundle(tokenBundle)

  orderedTokenBundle.forEach(({policyId, assets}) => {
    const assetToQuantityMap = new Map<api.AssetName, T>()

    assets.forEach(({assetName, quantity}) => {
      if (quantity.gt(0)) {
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

function normalizeTxOutput(txOutput: Omit<cab.TxOutput, 'isChange'>): api.TxOutput {
  const {address, coins, dataHash, tokenBundle} = txOutput

  return {
    address: addressToHex(address) as api.Address,
    value: normalizeTxValue(tokenBundle, coins),
    datumHash: dataHash !== undefined ? (dataHash as api.Hash32) : undefined,
  }
}

export function normalizeUtxo(utxo: cab.UTxO): api.TxUnspentOutput {
  return {
    txInput: normalizeTxInput(utxo),
    txOutput: normalizeTxOutput({
      address: utxo.address,
      coins: utxo.coins,
      tokenBundle: utxo.tokenBundle,
      ...optionalFields({
        dataHash: utxo.datumHash || (utxo.datum ? (hashDatum(utxo.datum) as api.Hash32) : undefined),
      }),
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
      } else {
        throw new UnexpectedError(UnexpectedErrorReason.UnsupportedOperationError)
      }
    }
  }
}

export function normalizeExUnits(exUnits: cab.TxExUnits): api.ExUnits {
  return {
    mem: new BigNumber(exUnits.memory) as api.UInt,
    steps: new BigNumber(exUnits.steps) as api.UInt,
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

    bootstrapWitness: witnessSet.bootstrapWitnesses?.map(
      ({publicKey, signature, chainCode, addressAttributes}) => ({
        publicKey: publicKey.toString('hex') as api.HexString,
        signature: signature.toString('hex') as api.HexString,
        chainCode: chainCode.toString('hex') as api.HexString,
        addressAttributes,
      })
    ),

    plutusScripts: witnessSet.plutusScripts?.map(
      (script) => script.bytes.toString('hex') as api.PlutusScript
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
          index = findIndex(
            orderedInputs,
            (utxo) =>
              utxo.txHash === redeemer.ref.txHash && utxo.outputIndex === redeemer.ref.outputIndex
          )
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
        mint: txAux.mint ? normalizeTxValue(txAux.mint) : undefined,
        scriptDataHash: txAux.scriptIntegrity as api.Hash32,
        collateralInputs: txAux.collateralInputs
          ? new Set(txAux.collateralInputs.map(normalizeTxInput))
          : undefined,
        requiredSigners: txAux.requiredSigners
          ? new Set(txAux.requiredSigners as unknown as api.AddressKeyHash[])
          : undefined,
        networkId:
          typeof txAux.networkId !== undefined
            ? (txAux.networkId as number as api.NetworkId)
            : undefined,
      }),
    },
    isValid: true,
    witnessSet: normalizeWitnessSet(witnessSet, txAux),
    // TODO currently no support for catalyst voting data
    // the metadatum types are compatible for now
    auxiliaryData: txAux.metadata as unknown as api.AuxiliaryData,
  }
}
