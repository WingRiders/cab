import {alonzoDateToSlotFactory, slotToDateFactory} from '@/helpers'
import assert from 'assert'
import {NetworkName} from '../src/types'

describe('SlotToDate', () => {
  it('preprod', () => {
    const slotToDate = slotToDateFactory(NetworkName.PREPROD)
    assert.equal(slotToDate(17062888).valueOf(), new Date('2023-01-03T11:41:28.000Z').valueOf())
  })
  it('mainnet', () => {
    const slotToDate = slotToDateFactory(NetworkName.MAINNET)
    assert.equal(slotToDate(55979196).valueOf(), new Date('2022-03-17T19:31:27.000Z').valueOf())
  })
})

describe('DateToSlot', () => {
  it('preprod', () => {
    const alonzoDateToSlot = alonzoDateToSlotFactory(NetworkName.PREPROD)
    assert.equal(alonzoDateToSlot(new Date('2023-01-03T11:41:28.000Z')), 17062888)
  })
  it('mainnet', () => {
    const alonzoDateToSlot = alonzoDateToSlotFactory(NetworkName.MAINNET)
    assert.equal(alonzoDateToSlot(new Date('2022-03-17T19:31:27.000Z')), 55979196)
  })
})
