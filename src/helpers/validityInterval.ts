import {Network, ValidityInterval} from '../types'

export const validityIntervalToSlots = (
  network: Network,
  validityInterval: ValidityInterval
): {
  ttl: number
  validityIntervalStart: number
} => ({
  validityIntervalStart: validityInterval.validityIntervalStartSlot,
  ttl:
    Math.floor(
      (validityInterval.ttl.getTime() - validityInterval.validityIntervalStart.getTime()) / 1000
    ) *
      network.slotLength +
    validityInterval.validityIntervalStartSlot,
})
