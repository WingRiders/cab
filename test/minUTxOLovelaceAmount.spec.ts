import assert from 'assert'
import {range} from 'lodash'

import {computeMinUTxOLovelaceAmount, computeValueSize, hashDatum} from '@/ledger/transaction'
import {Address, Lovelace, TxOutputType, ZeroLovelace} from '@/types'

import {protocolParameters} from './data/protocolParameters'
import {tokens} from './data/tokens'

const ADDRESS =
  'addr_test1qz3gy8e29dvnv5yh7yt63jez5eujm5x3ycvs690ft0dl0qxekak9gdv2957kajptsngac27d84fw4maeq9pl7qqdtenssqmxkl' as Address

describe('minUTxOLovelaceAmount', () => {
  it('value size for ada only', () => {
    assert.strictEqual(computeValueSize([]), 2)
  })

  it('ada only', () => {
    assert.deepStrictEqual(
      computeMinUTxOLovelaceAmount({
        minUtxoDepositCoefficient: protocolParameters.minUtxoDepositCoefficient,
        output: {
          type: TxOutputType.LEGACY,
          isChange: false,
          address: ADDRESS,
          coins: ZeroLovelace,
          tokenBundle: [],
        },
      }),
      new Lovelace(225).times(protocolParameters.minUtxoDepositCoefficient)
    )
  })

  // Following the alonzo golden tests - cardano-ledger-specs Test.Cardano.Ledger.Alonzo.Golden
  it('minimal token name with hash', () => {
    assert.deepStrictEqual(
      computeMinUTxOLovelaceAmount({
        minUtxoDepositCoefficient: protocolParameters.minUtxoDepositCoefficient,
        output: {
          type: TxOutputType.LEGACY,
          isChange: false,
          address: ADDRESS,
          coins: ZeroLovelace,
          tokenBundle: [tokens.tokenMinimal],
          datumHash: hashDatum([]),
        },
      }),
      new Lovelace(1_267_140)
    )
  })

  it('minimal token name no hash', () => {
    assert.deepStrictEqual(
      computeMinUTxOLovelaceAmount({
        minUtxoDepositCoefficient: protocolParameters.minUtxoDepositCoefficient,
        output: {
          type: TxOutputType.LEGACY,
          isChange: false,
          address: ADDRESS,
          coins: ZeroLovelace,
          tokenBundle: [tokens.tokenMinimal],
        },
      }),
      new Lovelace(1_120_600)
    )
  })

  it('1 policy 1 small name', () => {
    assert.deepStrictEqual(
      computeMinUTxOLovelaceAmount({
        minUtxoDepositCoefficient: protocolParameters.minUtxoDepositCoefficient,
        output: {
          type: TxOutputType.LEGACY,
          isChange: false,
          address: ADDRESS,
          coins: ZeroLovelace,
          tokenBundle: [tokens.smallToken('a')],
        },
      }),
      new Lovelace(1_124_910)
    )
  })

  it('1 policy 1 large name', () => {
    assert.deepStrictEqual(
      computeMinUTxOLovelaceAmount({
        minUtxoDepositCoefficient: protocolParameters.minUtxoDepositCoefficient,
        output: {
          type: TxOutputType.LEGACY,
          isChange: false,
          address: ADDRESS,
          coins: ZeroLovelace,
          tokenBundle: [tokens.largeToken('a')],
        },
      }),
      new Lovelace(1_262_830)
    )
  })

  it('1 policy 3 small names', () => {
    assert.deepStrictEqual(
      computeMinUTxOLovelaceAmount({
        minUtxoDepositCoefficient: protocolParameters.minUtxoDepositCoefficient,
        output: {
          type: TxOutputType.LEGACY,
          isChange: false,
          address: ADDRESS,
          coins: ZeroLovelace,
          tokenBundle: [tokens.smallToken('a'), tokens.smallToken('b'), tokens.smallToken('c')],
        },
      }),
      new Lovelace(1_150_770)
    )
  })

  it('2 policies 2 large names 1 small with hash', () => {
    assert.deepStrictEqual(
      computeMinUTxOLovelaceAmount({
        minUtxoDepositCoefficient: protocolParameters.minUtxoDepositCoefficient,
        output: {
          type: TxOutputType.LEGACY,
          isChange: false,
          address: ADDRESS,
          coins: ZeroLovelace,
          tokenBundle: [tokens.largeToken('a'), tokens.smallToken('L'), tokens.largeToken2('b')],
          datumHash: hashDatum([]),
        },
      }),
      new Lovelace(1_706_760)
    )
  })

  it('3 policies 3 large names 1 small with hash', () => {
    assert.deepStrictEqual(
      computeMinUTxOLovelaceAmount({
        minUtxoDepositCoefficient: protocolParameters.minUtxoDepositCoefficient,
        output: {
          type: TxOutputType.LEGACY,
          isChange: false,
          address: ADDRESS,
          coins: ZeroLovelace,
          tokenBundle: [
            tokens.largeToken('a'),
            tokens.largeToken2('b'),
            tokens.smallToken('L'),
            tokens.largeToken3('z'),
          ],
          datumHash: hashDatum([]),
        },
      }),
      new Lovelace(1_991_220)
    )
  })

  it('1 policy 3 large names with hash', () => {
    assert.deepStrictEqual(
      computeMinUTxOLovelaceAmount({
        minUtxoDepositCoefficient: protocolParameters.minUtxoDepositCoefficient,
        output: {
          type: TxOutputType.LEGACY,
          isChange: false,
          address: ADDRESS,
          coins: ZeroLovelace,
          tokenBundle: [tokens.largeToken('a'), tokens.largeToken('b'), tokens.largeToken('c')],
          datumHash: hashDatum([]),
        },
      }),
      new Lovelace(1_711_070)
    )
  })

  it('2 policies 1 smallest name', () => {
    assert.deepStrictEqual(
      computeMinUTxOLovelaceAmount({
        minUtxoDepositCoefficient: protocolParameters.minUtxoDepositCoefficient,
        output: {
          type: TxOutputType.LEGACY,
          isChange: false,
          address: ADDRESS,
          coins: ZeroLovelace,
          tokenBundle: [tokens.smallToken(''), tokens.smallToken2('')],
        },
      }),
      new Lovelace(1_262_830)
    )
  })

  it('2 policies 1 smallest name with hash', () => {
    assert.deepStrictEqual(
      computeMinUTxOLovelaceAmount({
        minUtxoDepositCoefficient: protocolParameters.minUtxoDepositCoefficient,
        output: {
          type: TxOutputType.LEGACY,
          isChange: false,
          address: ADDRESS,
          coins: ZeroLovelace,
          tokenBundle: [tokens.smallToken(''), tokens.smallToken2('')],
          datumHash: hashDatum([]),
        },
      }),
      new Lovelace(1_409_370)
    )
  })

  it('3 policies 96 small names', () => {
    const firstPolicies = range(32, 64).map((c) => tokens.smallToken(String.fromCharCode(c)))
    const secondPolicies = range(64, 96).map((c) => tokens.smallToken2(String.fromCharCode(c)))
    const thirdPolicies = range(96, 128).map((c) => tokens.smallToken3(String.fromCharCode(c)))
    assert.deepStrictEqual(
      computeMinUTxOLovelaceAmount({
        minUtxoDepositCoefficient: protocolParameters.minUtxoDepositCoefficient,
        output: {
          type: TxOutputType.LEGACY,
          isChange: false,
          address: ADDRESS,
          coins: ZeroLovelace,
          tokenBundle: [...firstPolicies, ...secondPolicies, ...thirdPolicies],
          datumHash: hashDatum([]),
        },
      }),
      new Lovelace(2_779_950)
    )
  })
})
