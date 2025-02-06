import assert from 'assert'

import {computeFeeForRefScripts} from '@/ledger/transaction/utils'

describe('computeFeeForRefScripts', () => {
  it('computes correct fees according to ogmios docs', () => {
    const minFeeReferenceScripts = {
      range: 25600,
      base: 44,
      multiplier: 1.2,
    }

    // Size range <0, 25_600) => Lovelace per byte = 44
    assert.strictEqual(computeFeeForRefScripts(0, minFeeReferenceScripts), 0)
    assert.strictEqual(computeFeeForRefScripts(1, minFeeReferenceScripts), 44)
    assert.strictEqual(computeFeeForRefScripts(25_599, minFeeReferenceScripts), 25_599 * 44)
    // Size range <25_600, 51_200) => Lovelace per byte = 52.8
    assert.strictEqual(computeFeeForRefScripts(25_600, minFeeReferenceScripts), 25_600 * 44)
    assert.strictEqual(
      computeFeeForRefScripts(51_199, minFeeReferenceScripts),
      Math.floor(25_600 * 44 + 25_599 * 52.8)
    )
    assert.strictEqual(
      computeFeeForRefScripts(51_200, minFeeReferenceScripts),
      Math.floor(25_600 * 44 + 25_600 * 52.8)
    )
    assert.strictEqual(
      computeFeeForRefScripts(76_799, minFeeReferenceScripts),
      Math.floor(25_600 * 44 + 25_600 * 52.8 + 25_599 * 63.36)
    )
    assert.strictEqual(
      computeFeeForRefScripts(76_800, minFeeReferenceScripts),
      Math.floor(25_600 * 44 + 25_600 * 52.8 + 25_600 * 63.36)
    )
    assert.strictEqual(
      computeFeeForRefScripts(81_920, minFeeReferenceScripts),
      Math.floor(25_600 * 44 + 25_600 * 52.8 + 25_600 * 63.36 + 5_120 * 76.032)
    ) // Example from docs
    assert.strictEqual(computeFeeForRefScripts(81_920, minFeeReferenceScripts), 4_489_379) // Example from docs
    assert.strictEqual(computeFeeForRefScripts(200_000, minFeeReferenceScripts), 17_827_801)
  })

  // https://github.com/IntersectMBO/cardano-ledger/blob/1d92855b45a5723b34f1441fc5ed00fb027da78a/eras/conway/impl/test/Test/Cardano/Ledger/Conway/Spec.hs
  it('computes correct fees according to cardano-ledger spec', () => {
    const minFeeReferenceScripts = {
      range: 25600,
      base: 15,
      multiplier: 1.5,
    }
    const results: number[] = []
    for (
      let referenceScriptSize = 0;
      referenceScriptSize <= 204800;
      referenceScriptSize += minFeeReferenceScripts.range
    ) {
      results.push(computeFeeForRefScripts(referenceScriptSize, minFeeReferenceScripts))
    }
    assert.deepStrictEqual(
      results,
      [0, 384000, 960000, 1824000, 3120000, 5064000, 7980000, 12354000, 18915000]
    )
  })
})
