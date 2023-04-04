import {valueAdd} from '@/ledger/assets'
import assert from 'assert'
import BigNumber from 'bignumber.js'

describe('Value', () => {
  it('valueAdd ada + token', () => {
    assert.deepEqual(valueAdd({'': {'': new BigNumber(4)}}, {policy: {name: new BigNumber(2)}}), {
      '': {'': new BigNumber(4)},
      policy: {name: new BigNumber(2)},
    })
  })

  it('valueAdd empty + ada + token', () => {
    assert.deepEqual(valueAdd({}, {'': {'': new BigNumber(4)}}, {policy: {name: new BigNumber(2)}}), {
      '': {'': new BigNumber(4)},
      policy: {name: new BigNumber(2)},
    })
  })

  it('valueAdd ada + token + ada', () => {
    assert.deepEqual(
      valueAdd(
        {'': {'': new BigNumber(4)}},
        {policy: {name: new BigNumber(2)}},
        {'': {'': new BigNumber(3)}}
      ),
      {
        '': {'': new BigNumber(7)},
        policy: {name: new BigNumber(2)},
      }
    )
  })

  it('valueAdd ada + token - ada', () => {
    assert.deepEqual(
      valueAdd(
        {'': {'': new BigNumber(4)}},
        {policy: {name: new BigNumber(2)}},
        {'': {'': new BigNumber(-3)}}
      ),
      {
        '': {'': new BigNumber(1)},
        policy: {name: new BigNumber(2)},
      }
    )
  })

  it('valueAdd token + token', () => {
    assert.deepEqual(
      valueAdd(
        {'': {'': new BigNumber(4)}},
        {policy: {name: new BigNumber(2)}},
        {policy: {name2: new BigNumber(1)}}
      ),
      {
        '': {'': new BigNumber(4)},
        policy: {name: new BigNumber(2), name2: new BigNumber(1)},
      }
    )
  })
})
