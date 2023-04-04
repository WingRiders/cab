import assert from 'assert'
import {
  TxRedeemerTag,
  Language,
  TxInput,
  Address,
  Lovelace,
  AssetQuantity,
  ZeroLovelace,
} from '../src/types'
import {hashScriptIntegrity, txFeeFunction} from '../src/ledger/transaction'
import {protocolParametersAlonzo as protocolParameters} from './data/protocolParameters'
import {Unit} from '../src/ledger/plutus'

describe('integrity hash', () => {
  const {costModels} = protocolParameters
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
      hashScriptIntegrity({redeemers: [], datums: [1], inputs: mockInputs, costModels}).toString('hex'),
      '4fb036bab07be26d263f69aae13ca5b1672bb8b96f4e60fe85f0638be9e0a26f'.toLowerCase()
    )
  })

  it('with datum input and redeeemer', () => {
    assert.equal(
      hashScriptIntegrity({
        costModels,
        redeemers: [
          {
            tag: TxRedeemerTag.SPEND,
            ref: {...mockInputs[0]},
            data: 42,
            exUnits: {memory: 5000, steps: 5000},
          },
        ],
        datums: [123],
        languages: [Language.PLUTUSV1],
        inputs: mockInputs,
      }).toString('hex'),
      '48EEAE99506F2C826581B40304D9AF1DA2D44969AA53F5BCACD10B6CBFA8DB26'.toLowerCase()
    )
  })

  it('with datum input/output and redeeemer', () => {
    assert.equal(
      hashScriptIntegrity({
        costModels,
        redeemers: [
          {
            tag: TxRedeemerTag.SPEND,
            ref: {...mockInputs[0]},
            data: 42,
            exUnits: {memory: 5000, steps: 5000},
          },
        ],
        datums: [123, 1],
        languages: [Language.PLUTUSV1],
        inputs: mockInputs,
      }).toString('hex'),
      '485541806b6009017ad0b02b8b786466435b1793b3d50fe9474740f4d52436e5'.toLowerCase()
    )
  })

  it('with strings', () => {
    assert.equal(
      hashScriptIntegrity({
        costModels,
        redeemers: [
          {
            tag: TxRedeemerTag.SPEND,
            ref: {...mockInputs[0]},
            data: 'hi',
            exUnits: {memory: 5000, steps: 5000},
          },
        ],
        datums: ['hello', [1, 2]], // out datums are added to the end
        languages: [Language.PLUTUSV1],
        inputs: mockInputs,
      }).toString('hex'),
      'c4a1f59b79cbf7c3ca95dfb39cfe29be663af246d6549f97b879b783033c9595'
    )
  })

  it('with datum input and mint', () => {
    assert.equal(
      hashScriptIntegrity({
        costModels,
        redeemers: [
          {
            tag: TxRedeemerTag.MINT,
            ref: {policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0'},
            data: 42,
            exUnits: {memory: 5000, steps: 5000},
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
      '2c93a03c754722c449004bdf539b0482de5c230082355a98c6b5c1416eec4d0a'
    )
  })

  it('failing tx on mainnet', () => {
    assert.equal(
      hashScriptIntegrity({
        costModels,
        redeemers: [
          {
            tag: TxRedeemerTag.MINT,
            ref: {policyId: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198'},
            data: new Unit(),
            exUnits: {memory: 1700, steps: 476468},
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
      '579c3687d76bc602e3d54d44536eb667b14c1ab8a944f826d97863e82c85277b'
    )
  })
})

describe('fees', () => {
  // taken from a withdrawing transaction from a simple script
  it('withdraw script', () => {
    const CLI_BUFFER = 100 // number of extra bytes compared to the cborHex in the signed txs
    assert.deepEqual(
      txFeeFunction(385 + CLI_BUFFER, protocolParameters, [{memory: 1700, steps: 476468}]),
      new Lovelace(176854)
    )
  })
})
