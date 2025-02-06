import assert from 'assert'

import {Unit} from '@/ledger/plutus'
import {hashScriptIntegrity, txFeeFunction} from '@/ledger/transaction'
import {Address, AssetQuantity, Language, Lovelace, TxInput, TxRedeemerTag, ZeroLovelace} from '@/types'

import {protocolParameters} from './data/protocolParameters'

describe('integrity hash', () => {
  const mockInputs: TxInput[] = [
    {
      address:
        'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3' as Address,
      txHash: 'ead81ec1881684109cfe609c565810704fa54634db28fbdff3751748b1a16d95',
      coins: ZeroLovelace,
      outputIndex: 0,
      tokenBundle: [],
    },
  ]

  it('with datum output', () => {
    assert.equal(
      hashScriptIntegrity({redeemers: [], datums: [1], inputs: mockInputs, protocolParameters}).toString(
        'hex'
      ),
      '7901926c6b5549d6df40f20491b84eef0cefb757444d7e770be975603c2489cb'
    )
  })

  it('with datum input and redeeemer', () => {
    assert.equal(
      hashScriptIntegrity({
        protocolParameters,
        redeemers: [
          {
            tag: TxRedeemerTag.SPEND,
            ref: {...mockInputs[0]},
            data: 42,
            exUnits: {memory: 5000, cpu: 5000},
          },
        ],
        datums: [123],
        languages: [Language.PLUTUSV1],
        inputs: mockInputs,
      }).toString('hex'),
      '55b314267fbd773a9d05f6b9f65a026c6d5dbf782bd4ffa2402a5ab8a3ba0272'
    )
  })

  it('with datum input/output and redeeemer', () => {
    assert.equal(
      hashScriptIntegrity({
        protocolParameters,
        redeemers: [
          {
            tag: TxRedeemerTag.SPEND,
            ref: {...mockInputs[0]},
            data: 42,
            exUnits: {memory: 5000, cpu: 5000},
          },
        ],
        datums: [123, 1],
        languages: [Language.PLUTUSV1],
        inputs: mockInputs,
      }).toString('hex'),
      '0782ed76f83a212fdaee542f7d95a415054ef5fdd4715df56ab05ddd7cb14625'
    )
  })

  it('with strings', () => {
    assert.equal(
      hashScriptIntegrity({
        protocolParameters,
        redeemers: [
          {
            tag: TxRedeemerTag.SPEND,
            ref: {...mockInputs[0]},
            data: 'hi',
            exUnits: {memory: 5000, cpu: 5000},
          },
        ],
        datums: ['hello', [1, 2]], // out datums are added to the end
        languages: [Language.PLUTUSV1],
        inputs: mockInputs,
      }).toString('hex'),
      '9e7e8e64df4cbd8f4a284f7dbfcef3562a4d1b18013529c48edb84bccf92d161'
    )
  })

  it('with datum input and mint', () => {
    assert.equal(
      hashScriptIntegrity({
        protocolParameters,
        redeemers: [
          {
            tag: TxRedeemerTag.MINT,
            ref: {policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0'},
            data: 42,
            exUnits: {memory: 5000, cpu: 5000},
          },
        ],
        datums: [123],
        languages: [Language.PLUTUSV1],
        inputs: mockInputs,
        mint: [
          {
            policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
            assetName: '66697273746173736574',
            quantity: new AssetQuantity(8),
          },
        ],
      }).toString('hex'),
      '84dc7dfae5afe6693cf578a15bcb745a9ca7ed0a5a02ee676e8b76a15afa74d7'
    )
  })

  it('failing tx on mainnet', () => {
    assert.equal(
      hashScriptIntegrity({
        protocolParameters,
        redeemers: [
          {
            tag: TxRedeemerTag.MINT,
            ref: {policyId: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198'},
            data: new Unit(),
            exUnits: {memory: 1700, cpu: 476468},
          },
        ],
        datums: [],
        languages: [Language.PLUTUSV1],
        inputs: mockInputs,
        mint: [
          {
            policyId: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198',
            assetName: '66697273746173736574',
            quantity: new AssetQuantity(8),
          },
          {
            policyId: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198',
            assetName: '666972737461737365',
            quantity: new AssetQuantity(3),
          },
        ],
      }).toString('hex'),
      '95d4a95ba7bc950e5d9de2f598f711f9c2466757ceb2448a9dfe102c99c0b89b'
    )
  })
})

describe('fees', () => {
  // taken from a withdrawing transaction from a simple script
  it('withdraw script', () => {
    const CLI_BUFFER = 100 // number of extra bytes compared to the cborHex in the signed txs
    assert.deepEqual(
      txFeeFunction(385 + CLI_BUFFER, 0, protocolParameters, [{memory: 1700, cpu: 476468}]),
      new Lovelace(176854)
    )
  })
})
