import {encode} from 'borc'
import {blake2b} from 'cardano-crypto.js'
import {TxRedeemer, TxDatum, TxInput, Language} from '@/types/transaction'
import {cborizeTxDatums, cborizeTxRedeemers} from './cbor/cborize'
import {encodeCostModels} from './costModel'
import {TokenBundle, Hash32String} from '@/types/base'
import {ProtocolParameters} from '@/types/protocolParameters'
import {TxPlan} from '@/types/txPlan'

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
  // match hashScriptIntegrity from Cardano.Ledger.Alonzo.Tx
  const buffer = Buffer.concat([
    // if there are no redeemers, still add an empty array
    redeemers ? encode(cborizeTxRedeemers(redeemers, inputs, mint)) : encode(Buffer.from([])),
    // if there are no dats, it's skipped
    datums && datums.length > 0 ? encode(cborizeTxDatums(datums)) : Buffer.from([]),
    encodeCostModels(languages, costModels),
  ])

  return blake2b(buffer, 32)
}

export function computeScriptIntegrity(txPlan: TxPlan): Hash32String | undefined {
  if (txPlan.redeemers?.length || txPlan.datums?.length || txPlan.scripts?.length) {
    return hashScriptIntegrity({
      redeemers: txPlan.redeemers ?? [],
      datums: txPlan.datums ?? [],
      // assume PlutusV1 scripts only for now
      languages: txPlan.scripts?.length ? [Language.PLUTUSV1] : [],
      inputs: txPlan.inputs,
      mint: txPlan.mint || [],
      costModels: txPlan.protocolParameters.costModels,
    }).toString('hex')
  }

  return undefined
}
