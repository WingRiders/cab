import {NETWORKS} from '../constants/networks'
import {NetworkName} from '../types/network'

export const slotToEpochFactory =
  (networkName: NetworkName) =>
  (slot: number): number => {
    const {shelleyInitialSlot, shelleyInitialEpoch, epochSlots} = NETWORKS[networkName]

    return shelleyInitialEpoch + Math.floor((slot - shelleyInitialSlot) / epochSlots)
  }

export const slotToDateFactory =
  (networkName: NetworkName) =>
  (slot: number): Date => {
    const {shelleyInitialSlot, shelleySlotSeconds, byronSlotSeconds, epoch0} = NETWORKS[networkName]

    const byronSlots = Math.min(slot, shelleyInitialSlot)
    const byronMiliseconds = byronSlots * byronSlotSeconds * 1000
    const shelleySlots = Math.max(slot - byronSlots, 0)
    const shelleyMiliseconds = shelleySlots * shelleySlotSeconds * 1000

    return new Date(epoch0 * 1000 + byronMiliseconds + shelleyMiliseconds)
  }

export const dateToEpochFactory = (networkName: NetworkName) => (date: Date | number) => {
  return slotToEpochFactory(networkName)(alonzoDateToSlotFactory(networkName)(new Date(date)))
}

/**
 * This works only for current dates and not historical ones
 * @param date the date to be converted into slots
 * @param networkSettings the network configuration
 */
export const alonzoDateToSlotFactory =
  (networkName: NetworkName) =>
  (date: Date | number): number => {
    const {shelleyInitialSlot, shelleySlotSeconds, byronSlotSeconds, epoch0} = NETWORKS[networkName]

    const byronSlots = shelleyInitialSlot
    const byronMiliseconds = byronSlots * byronSlotSeconds * 1000

    const shelleyMilliseconds = new Date(date).valueOf() - epoch0 * 1000 - byronMiliseconds
    const shelleySlots = Math.floor(shelleyMilliseconds / (1000 * shelleySlotSeconds))

    return shelleySlots + byronSlots
  }

export const getCurrentEpochFactory = (networkName: NetworkName) => () => {
  return dateToEpochFactory(networkName)(Date.now())
}

/**
 * Get epoch starting date
 */
export const getEpochStartDateFactory = (networkName: NetworkName) => (epoch: number) => {
  const selectedEpochFirstSlot = epochToSlotBoundariesFactory(networkName)(epoch)[0]

  return slotToDateFactory(networkName)(selectedEpochFirstSlot)
}

/**
 * Epoch boundaries represent interval [startSlot, endSlot)
 */
export const epochToSlotBoundariesFactory =
  (networkName: NetworkName) =>
  (epoch: number): [number, number] => {
    const {shelleyInitialSlot, shelleyInitialEpoch, epochSlots} = NETWORKS[networkName]

    const firstSlot = shelleyInitialSlot + (epoch - shelleyInitialEpoch) * epochSlots
    const lastSlot = firstSlot + epochSlots

    return [firstSlot, lastSlot]
  }

/**
 * @returns function that returns the first slot in the given epoch
 */
export const getFirstEpochSlotFactory = (networkName: NetworkName) => (epoch: number) => {
  const [firstSlot] = epochToSlotBoundariesFactory(networkName)(epoch)
  return firstSlot
}

/**
 * @returns function that returns the latest slot in the given epoch
 */
export const getLastEpochSlotFactory = (networkName: NetworkName) => (epoch: number) => {
  const [, lastSlot] = epochToSlotBoundariesFactory(networkName)(epoch)
  return lastSlot - 1
}
