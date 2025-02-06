import assert, {AssertionError, deepStrictEqual, strictEqual} from 'assert'
import BigNumber from 'bignumber.js'
import {decode} from 'borc'

import * as api from '@/dappConnector'
import {TxOutputType} from '@/dappConnector'
import {adaToLovelace} from '@/helpers'
import {TxWitnessKey} from '@/ledger/transaction'
import {parseUtxo, parseValue, parseVKeyWitnesses} from '@/wallet/connector/parse'

function assertIsDefined<T>(val: T): asserts val is T extends undefined ? never : T {
  if (val === undefined) {
    throw new AssertionError({message: `Expected 'val' to be defined, but received ${val}`})
  }
}

const assertValuesEqual = (a: api.Value, b: api.Value): void => {
  deepStrictEqual([...a.keys()], [...b.keys()])
  for (const [policyId, assetsA] of a) {
    const assetsB = b.get(policyId)
    assertIsDefined(assetsB)
    deepStrictEqual([...assetsA.keys()], [...assetsB.keys()])
    for (const [assetName, quantityA] of assetsA) {
      const quantityB = assetsB.get(assetName)
      assertIsDefined(quantityB)
      assert(quantityA.eq(quantityB), `${quantityA} does not equal ${quantityB}`)
    }
  }
}

describe('Parse', () => {
  it('utxo', () => {
    const decodedUtxo = decode(
      '828258208bbeb5081a41265217c6968b126642c3ff2e0386ab3a03835cd6e978b5d530dd008258390068faaeb21d779ae66a86a3aa2576111ad1ea6e547a43ff01c17735cb12c5f10629559e9b3cb97e69a274d05b72d218aa834c68ac6efeaef41a003d0900'
    )
    const {txInput, txOutput} = parseUtxo(decodedUtxo)
    const expected = {
      txInput: {
        txHash: '8bbeb5081a41265217c6968b126642c3ff2e0386ab3a03835cd6e978b5d530dd',
        index: new BigNumber(0),
      },
      txOutput: {
        address:
          '0068faaeb21d779ae66a86a3aa2576111ad1ea6e547a43ff01c17735cb12c5f10629559e9b3cb97e69a274d05b72d218aa834c68ac6efeaef4',
        value: new Map([['', new Map([['', new BigNumber(adaToLovelace(4))]])]]),
      },
    } as api.TxUnspentOutput
    strictEqual(txInput.txHash, expected.txInput.txHash)
    assert(txInput.index.eq(expected.txInput.index), 'indices not equal')
    strictEqual(txOutput.address, expected.txOutput.address)
    assertValuesEqual(txOutput.value, expected.txOutput.value)
    assert(txOutput.type === TxOutputType.LEGACY)
    strictEqual(txOutput.datumHash, undefined)
  })

  it('vkey witnesses', () => {
    const decoded = decode(
      'a100818258204815e36daf9d55d25972b096685e57e367bb53ade8d315b823da3c24a3be40085840e11814e360c6f360deb769cc6b3a570327ccbb3369d1f0b123c8febe7005c94b1cd23b191c7cf9c1aecf613c3f964f0c3bfaf7960c02329bd7f53dc8a54cea0d'
    )
    const vKeyWitnesses = decoded.get(TxWitnessKey.SHELLEY)
    const parsed = vKeyWitnesses && parseVKeyWitnesses(vKeyWitnesses)
    deepStrictEqual(parsed, [
      {
        publicKey: '4815e36daf9d55d25972b096685e57e367bb53ade8d315b823da3c24a3be4008',
        signature:
          'e11814e360c6f360deb769cc6b3a570327ccbb3369d1f0b123c8febe7005c94b1cd23b191c7cf9c1aecf613c3f964f0c3bfaf7960c02329bd7f53dc8a54cea0d',
      },
    ])
  })

  it('value', () => {
    const decoded = decode(
      '821a3bae380aa1581c648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198a14577444f474519b2ed'
    )
    const expected = new Map([
      ['', new Map([['', new BigNumber(1001273354)]])],
      [
        '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198',
        new Map([[Buffer.from('wDOGE').toString('hex'), new BigNumber(45805)]]),
      ],
    ]) as api.Value
    assertValuesEqual(parseValue(decoded), expected)
  })
})
