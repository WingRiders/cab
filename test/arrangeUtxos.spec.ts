import assert from 'assert'

import {arrangeUtxos} from '../src/ledger/transaction/arrangeUtxos'
import {utxoSettings} from './data/utxoSettings.spec'

describe('Utxo selection', () => {
  Object.entries(utxoSettings).forEach(([name, setting]) =>
    it(`should select utxos correctly when ${name}`, () => {
      const [selectedUtxos, _selectedCollaterals] = arrangeUtxos(
        setting.availableUtxos,
        setting.txPlanArgs
      )
      assert.deepEqual(selectedUtxos, setting.selectedUtxos)
    })
  )
})
