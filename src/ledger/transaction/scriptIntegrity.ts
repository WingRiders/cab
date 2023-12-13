import {encode} from 'borc'
import {blake2b} from 'cardano-crypto.js'
import {uniq} from 'lodash'

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
  costModels,
  languages = [],
  mint = [],
}: {
  redeemers: TxRedeemer[]
  datums: TxDatum[]
  inputs: TxInput[]
  costModels: ProtocolParameters['costModels']
  languages?: Language[]
  mint?: TokenBundle
}): Buffer => {
  const encodedRedeemers = redeemers
    ? encode(cborizeTxRedeemers(redeemers, inputs, mint))
    : // if there are no redeemers, still add an empty array
      encode(Buffer.from([]))
  const encodedDatums =
    datums && datums.length > 0
      ? encode(cborizeTxDatums(datums))
      : // if there are no datums, it's skipped
        Buffer.from([])
  const encodedCostModels = encodeCostModels(languages, costModels)
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
      costModels: txPlan.protocolParameters.costModels,
    }).toString('hex')
  }

  return undefined
}
