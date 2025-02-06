import * as cbor from 'borc'
import {sortBy, uniq} from 'lodash'

import {HexString} from '@/types/base'
import {
  Language,
  TxDatum,
  TxMintRedeemer,
  TxRedeemer,
  TxRedeemerTag,
  TxScript,
  TxShelleyWitness,
  TxSpendRedeemer,
  TxWitnessSet,
} from '@/types/transaction'

import {CborInt64} from './cbor/CborInt64'
import {
  cborizeRequiredSigners,
  cborizeTxCertificates,
  cborizeTxInputs,
  cborizeTxOutputs,
  cborizeTxOutputTokenBundle,
  cborizeTxWithdrawals,
  cborizeTxWitnesses,
} from './cbor/cborize'
import {
  CborizedCliWitness,
  CborizedTxRedeemer,
  CborizedTxScript,
  CborizedTxStructured,
  CborizedTxWitnesses,
  CborizedTxWitnessShelley,
  TxAux,
  TxAuxData,
  TxBodyKey,
  TxSigned,
  TxWitnessKey,
} from './cbor/cborizedTx'
import {CborizedTxDatum} from './cbor/CborizedTxDatum'
import {hashSerialized} from './utils'

// Makes all properties available in the class
export interface ShelleyTxAux extends TxAux {}
export class ShelleyTxAux {
  constructor(data: TxAuxData) {
    Object.assign(this, data)
  }

  public getId() {
    return hashSerialized(this)
  }

  public encodeCBOR(encoder: any) {
    const txBody = new Map<TxBodyKey, any>()
    txBody.set(TxBodyKey.INPUTS, cborizeTxInputs(this.inputs))
    if (this.referenceInputs?.length) {
      txBody.set(TxBodyKey.REFERENCE_INPUTS, cborizeTxInputs(this.referenceInputs))
    }
    if (this.collateralInputs && this.collateralInputs?.length > 0) {
      txBody.set(TxBodyKey.COLLATERAL_INPUTS, cborizeTxInputs(this.collateralInputs))
    }
    txBody.set(TxBodyKey.OUTPUTS, cborizeTxOutputs(this.outputs))
    txBody.set(TxBodyKey.FEE, new CborInt64(this.fee))
    if (this.ttl !== null) {
      txBody.set(TxBodyKey.TTL, new CborInt64(this.ttl))
    }
    if (this.certificates.length) {
      txBody.set(TxBodyKey.CERTIFICATES, cborizeTxCertificates(this.certificates))
    }
    if (this.withdrawals.length) {
      txBody.set(TxBodyKey.WITHDRAWALS, cborizeTxWithdrawals(this.withdrawals))
    }
    if (this.auxiliaryDataHash) {
      txBody.set(TxBodyKey.AUXILIARY_DATA_HASH, Buffer.from(this.auxiliaryDataHash, 'hex'))
    }
    if (this.validityIntervalStart !== null) {
      txBody.set(TxBodyKey.VALIDITY_INTERVAL_START, new CborInt64(this.validityIntervalStart))
    }
    if (this.requiredSigners && this.requiredSigners.length > 0) {
      txBody.set(TxBodyKey.REQUIRED_SIGNERS, cborizeRequiredSigners(this.requiredSigners))
    }
    if (this.mint?.length) {
      txBody.set(TxBodyKey.MINT, cborizeTxOutputTokenBundle(this.mint, true))
    }
    if (this.scriptIntegrity) {
      txBody.set(TxBodyKey.SCRIPT_DATA_HASH, Buffer.from(this.scriptIntegrity, 'hex'))
    }
    if (typeof this.networkId !== 'undefined') {
      txBody.set(TxBodyKey.NETWORK_ID, this.networkId)
    }
    return encoder.pushAny(txBody)
  }
}

export function signedTransaction(txAux: TxAux, witnessSet: TxWitnessSet): TxSigned {
  const cborizedWitnessSet = cborizeTxWitnesses({
    shelleyWitnesses: witnessSet.vKeyWitnesses || [],
    scripts: witnessSet.plutusScripts,
    datums: witnessSet.plutusDatums,
    redeemers: witnessSet.redeemers,
    inputs: txAux.inputs,
    mint: txAux.mint,
  })
  const structuredTx = ShelleyTransactionStructured(txAux, cborizedWitnessSet)
  return {
    txHash: txAux.getId(),
    txBody: cbor.encode(structuredTx).toString('hex'),
  }
}

export function ShelleyTransactionStructured(
  txAux: TxAux,
  txWitnesses: CborizedTxWitnesses
): CborizedTxStructured {
  function getId(): HexString {
    return txAux.getId()
  }

  function encodeCBOR(encoder: any) {
    return encoder.pushAny([
      txAux,
      txWitnesses,
      true, // isValid
      txAux.metadata, // shelley compatible without extra scripts
    ])
  }

  function getWitnessSet(): TxWitnessSet {
    const orderedInputs = sortBy(txAux.inputs, ['txHash', 'outputIndex'])
    const orderedPolicies = uniq(txAux.mint?.map((token) => token.policyId) || []).sort()
    return {
      vKeyWitnesses: txWitnesses.get(TxWitnessKey.SHELLEY)?.map(
        (shelleyWitness: CborizedTxWitnessShelley): TxShelleyWitness => ({
          publicKey: shelleyWitness[0],
          signature: shelleyWitness[1],
        })
      ),
      plutusScripts:
        txWitnesses.has(TxWitnessKey.SCRIPTS_V1) || txWitnesses.has(TxWitnessKey.SCRIPTS_V2)
          ? (
              txWitnesses.get(TxWitnessKey.SCRIPTS_V1)?.map(
                (script: CborizedTxScript): TxScript => ({
                  language: Language.PLUTUSV1,
                  bytes: script,
                })
              ) ?? []
            ).concat(
              ...(txWitnesses.get(TxWitnessKey.SCRIPTS_V2)?.map(
                (script: CborizedTxScript): TxScript => ({
                  language: Language.PLUTUSV2,
                  bytes: script,
                })
              ) ?? [])
            )
          : undefined,
      plutusDatums: txWitnesses
        .get(TxWitnessKey.DATA)
        ?.map((datum: CborizedTxDatum): TxDatum => datum.data),
      redeemers: txWitnesses
        .get(TxWitnessKey.REDEEMERS)
        ?.map(([tag, index, datum, exUnits]: CborizedTxRedeemer): TxRedeemer => {
          const base: Omit<TxRedeemer, 'ref' | 'index'> = {
            tag,
            exUnits: {
              memory: exUnits[0],
              cpu: exUnits[1],
            },
            data: datum.data,
          }
          switch (tag) {
            case TxRedeemerTag.SPEND: {
              const input = orderedInputs[index]
              return {
                ...base,
                ref: {
                  txHash: input.txHash,
                  outputIndex: input.outputIndex,
                },
              } as TxSpendRedeemer
            }
            case TxRedeemerTag.MINT: {
              return {
                ...base,
                ref: {policyId: orderedPolicies[index]},
              } as TxMintRedeemer
            }
            default: {
              return {
                ...base,
                index,
              } as TxRedeemer
            }
          }
        }),
    }
  }

  return {
    getId,
    encodeCBOR,
    getWitnessSet,
  }
}

export function cborizeCliWitness(txSigned: TxSigned): CborizedCliWitness {
  const [, witnesses]: [any, CborizedTxWitnesses] = cbor.decode(txSigned.txBody)
  // there can be only one witness since only one signing file was passed
  const witnessMap = new Map(witnesses)
  if (witnessMap.has(TxWitnessKey.SHELLEY)) {
    return [
      TxWitnessKey.SHELLEY,
      (witnessMap.get(TxWitnessKey.SHELLEY) as CborizedTxWitnessShelley[])[0],
    ]
  } else {
    throw new Error('Unsupported CLI witness')
  }
}
