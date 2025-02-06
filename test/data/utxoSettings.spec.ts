import {adaToLovelace} from '../../src/helpers'
import {Address, AssetQuantity, Lovelace, TxPlanArgs, ZeroLovelace} from '../../src/types'
import {protocolParameters} from './protocolParameters'

export const utxos = {
  adaOnly: {
    txHash: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    address:
      'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3' as Address,
    coins: new Lovelace(adaToLovelace(10)) as Lovelace,
    outputIndex: 0,
    tokenBundle: [],
  },
  withTokens1: {
    txHash: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    address:
      'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3' as Address,
    coins: new Lovelace(adaToLovelace(10)) as Lovelace,
    outputIndex: 1,
    tokenBundle: [
      {
        policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
        assetName: '7365636f6e646173736574',
        quantity: new AssetQuantity(4),
      },
    ],
  },
  withTokens2: {
    txHash: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    address:
      'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3' as Address,
    coins: new Lovelace(adaToLovelace(10)) as Lovelace,
    outputIndex: 2,
    tokenBundle: [
      {
        policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
        assetName: '66697273746173736574',
        quantity: new AssetQuantity(8),
      },
    ],
  },
}

export const utxoSettings = {
  'sending ada without tokens': {
    txPlanArgs: {
      planId: 'sendAda',
      outputs: [
        {
          address:
            'addr1qjag9rgwe04haycr283datdrjv3mlttalc2waz34xcct0g4uvf6gdg3dpwrsne4uqng3y47ugp2pp5dvuq0jqlperwj83r4pwxvwuxsgds90s0' as Address,
          coins: new Lovelace(adaToLovelace(1)) as Lovelace,
          tokenBundle: [],
        },
      ],
      protocolParameters,
    } as TxPlanArgs,
    availableUtxos: [utxos.withTokens1, utxos.adaOnly],
    selectedUtxos: [utxos.adaOnly, utxos.withTokens1],
  },
  'sending tokens': {
    txPlanArgs: {
      planId: 'sendToken',
      outputs: [
        {
          address:
            'addr1qjag9rgwe04haycr283datdrjv3mlttalc2waz34xcct0g4uvf6gdg3dpwrsne4uqng3y47ugp2pp5dvuq0jqlperwj83r4pwxvwuxsgds90s0' as Address,
          coins: ZeroLovelace,
          tokenBundle: [
            {
              policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
              assetName: '7365636f6e646173736574',
              quantity: new AssetQuantity(2),
            },
          ],
        },
      ],
      protocolParameters,
    } as TxPlanArgs,
    availableUtxos: [utxos.adaOnly, utxos.withTokens2, utxos.withTokens1],
    selectedUtxos: [utxos.withTokens1, utxos.adaOnly, utxos.withTokens2],
  },
}
