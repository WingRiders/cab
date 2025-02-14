import {encode} from 'borc'
import {uniq} from 'lodash'

import {blake2b} from '@/helpers/blake2b'
import {Hash32String, TokenBundle} from '@/types/base'
import {ProtocolParameters} from '@/types/protocolParameters'
import {Language, TxDatum, TxInput, TxRedeemer} from '@/types/transaction'
import {TxPlan} from '@/types/txPlan'

import {cborizeTxDatums, cborizeTxRedeemers} from './cbor/cborize'
import {encodeCostModels} from './costModel'

export const hashScriptIntegrity = ({
  redeemers,
  datums,
  inputs,
  protocolParameters,
  languages = [],
  mint = [],
}: {
  redeemers: TxRedeemer[]
  datums: TxDatum[]
  inputs: TxInput[]
  protocolParameters: Pick<ProtocolParameters, 'minFeeReferenceScripts' | 'plutusCostModels'>
  languages?: Language[]
  mint?: TokenBundle
}): Buffer => {
  const encodedRedeemers =
    redeemers && redeemers.length > 0
      ? encode(cborizeTxRedeemers(redeemers, inputs, mint))
      : // if there are no redeemers, still add an empty map
        encode(new Map())
  const encodedDatums =
    datums && datums.length > 0
      ? encode(cborizeTxDatums(datums))
      : // if there are no datums, it's skipped
        Buffer.from([])
  const encodedCostModels = encodeCostModels(languages, protocolParameters.plutusCostModels)
  // match hashScriptIntegrity from Cardano.Ledger.Alonzo.Tx
  const buffer = Buffer.concat([encodedRedeemers, encodedDatums, encodedCostModels])

  return blake2b(buffer, 32)
}

export function computeScriptIntegrity(txPlan: TxPlan): Hash32String | undefined {
  if (txPlan.redeemers?.length || txPlan.datums?.length || txPlan.scripts?.length) {
    return hashScriptIntegrity({
      redeemers: txPlan.redeemers ?? [],
      datums: txPlan.datums ?? [],
      languages: uniq((txPlan.scripts ?? []).map(({language}) => language)),
      inputs: txPlan.inputs,
      mint: txPlan.mint || [],
      protocolParameters: txPlan.protocolParameters,
    }).toString('hex')
  }

  return undefined
}
