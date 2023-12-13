import differenceInDays from 'date-fns/differenceInDays'
import differenceInMinutes from 'date-fns/differenceInMinutes'
import subDays from 'date-fns/subDays'

import {OptionalErrorParams} from '@/errors'

import {CabInternalError, CabInternalErrorReason} from '../errors'

// TODO shouldn't this depend on the genesis files?
export function isEpochBoundaryUnderway(): boolean {
  const epochTransition = new Date('15 May 2021 21:44 UTC')
  const now = Date.now()
  const dayDiff = differenceInDays(now, epochTransition)
  const relativeMinuteDiff = differenceInMinutes(subDays(now, dayDiff), epochTransition)
  // multiple of 5 days passed and it's no more than X minutes since the transition
  if (dayDiff % 5 === 0 && relativeMinuteDiff < 60) {
    return true
  }
  return false
}

export function throwIfEpochBoundary(params?: OptionalErrorParams): void {
  if (isEpochBoundaryUnderway()) {
    throw new CabInternalError(CabInternalErrorReason.EpochBoundaryUnderway, params)
  }
}
