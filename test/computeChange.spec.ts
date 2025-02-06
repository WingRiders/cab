import assert from 'assert'

import {createTokenChangeOutputs} from '@/ledger/transaction'
import {Address, AssetQuantity, Lovelace, TxOutputType} from '@/types'

import {protocolParameters} from './data/protocolParameters'

const tokens = {
  // TODO: move to constants
  token1: {
    policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
    assetName: '66697273746173736574',
    quantity: new AssetQuantity(8),
  },
  token2: {
    policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
    assetName: '7365636f6e646173736574',
    quantity: new AssetQuantity(4),
  },
  token3: {
    policyId: '6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7',
    assetName: '',
    quantity: new AssetQuantity(2),
  },
}

const createOutput = (coins, tokenBundle) => ({
  type: TxOutputType.LEGACY,
  isChange: true,
  address:
    'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3',
  coins: new Lovelace(coins),
  tokenBundle,
})

const maxOutputTokens = 3

const address =
  'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3' as Address

const fixtures = {
  'with number of tokens equal to max': {
    tokenBundle: Object.values(tokens),
    outputs: [createOutput(1361960, Object.values(tokens))],
  },
  'with number of tokens smaller than max': {
    tokenBundle: [tokens.token1, tokens.token2],
    outputs: [createOutput(1219730, [tokens.token1, tokens.token2])],
  },
  'with number of tokens bigger than max': {
    tokenBundle: [...Object.values(tokens), tokens.token1, tokens.token2],
    outputs: [
      createOutput(1361960, Object.values(tokens)),
      createOutput(1219730, [tokens.token1, tokens.token2]),
    ],
  },
  'with one token': {
    tokenBundle: [tokens.token1],
    outputs: [createOutput(1163700, [tokens.token1])],
  },
  'without tokens': {
    tokenBundle: [],
    outputs: [],
  },
}

describe('Change computing', () => {
  Object.entries(fixtures).forEach(([name, setting]) =>
    it(`should compute change ${name}`, () => {
      const {tokenBundle, outputs} = setting
      assert.deepStrictEqual(
        createTokenChangeOutputs({
          minUtxoDepositCoefficient: protocolParameters.minUtxoDepositCoefficient,
          changeAddress: address,
          changeTokenBundle: tokenBundle,
          maxOutputTokens,
        }),
        outputs
      )
    })
  )
})
