import assert from 'assert'

import {parseFromSchemaJson} from '@/ledger/plutus'
import {normalizeDatum, normalizeTxInput, normalizeUtxo} from '@/wallet/connector/normalize'
import {reverseDatum, reverseInputs, reverseUtxo} from '@/wallet/connector/reverse'

import {utxos} from './data/utxoSettings.spec'

describe('connector normalize', () => {
  it('datum', () => {
    const swapRequestJson =
      '{"fields":[{"fields":[{"bytes":"6ad510fe5e2eff4f367475f01ab79dc4cd1f2600bda02ab270577637"},{"int":1596059705999}],"constructor":0},{"fields":[{"fields":[{"bytes":""},{"bytes":""}],"constructor":0},{"fields":[{"bytes":"4fa7d01048662a5d68a93aeb6e1e4bcf60964c953195459d9c8e8b29"},{"bytes":"42"}],"constructor":0},{"int":140}],"constructor":0}],"constructor":0}'
    const datum = parseFromSchemaJson(swapRequestJson)
    const connectorDatum = normalizeDatum(datum)
    const reversedDatum = reverseDatum(connectorDatum)
    assert.deepEqual(reversedDatum, datum)
  })

  describe('inputs', () => {
    for (const [key, utxo] of Object.entries(utxos)) {
      it(`utxo converted ${key}`, () => {
        const connectorInput = normalizeTxInput(utxo)
        const reversedInput = reverseInputs([connectorInput], [utxo])[0]
        assert.deepEqual(utxo, reversedInput)
      })
    }
  })

  describe('utxos', () => {
    for (const [key, utxo] of Object.entries(utxos)) {
      it(`utxo converted ${key}`, () => {
        const connectorUtxo = normalizeUtxo(utxo)
        const reversedUtxo = reverseUtxo(connectorUtxo)
        assert.deepEqual(utxo, reversedUtxo)
      })
    }
  })
})
