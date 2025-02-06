import {chain, throttle} from 'lodash'

import {Hashable, hashArgs} from './hashArgs'

type CacheObject = Record<string, {timestamp: number; data: any; lastAccessed: number}>

type CacheOptions = {
  expiry: number // expired AFTER this timestamp
  maxEntries?: number // the cache would allow 2x this amount
  cacheObj: CacheObject
  extendKey?: () => Hashable
}

const GC_TIMEOUT = 2000

const throttledGC = throttle((options: Pick<CacheOptions, 'maxEntries'>, cacheObj: CacheObject) => {
  const now = Date.now()
  const expiredKeys = Object.entries(cacheObj)
    .filter(([_key, cacheEntry]) => cacheEntry?.timestamp < now)
    .map(([key, _cacheEntry]) => key)
  expiredKeys.forEach((key) => {
    delete cacheObj[key]
  })
  // remove least recently used if still big
  // use a buffer of 2x the amount of entries for now
  const cacheSize = Object.keys(cacheObj).length
  if (options.maxEntries && cacheSize > options.maxEntries * 2) {
    const oldKeysWithLastUsed = chain(cacheObj)
      .map(({lastAccessed}, key) => [key, lastAccessed])
      .sortBy([1]) // sort in growing order from oldest to newest
      .take(cacheSize - options.maxEntries)
      .value()
    oldKeysWithLastUsed.forEach(([key, _lastUsed]) => {
      delete cacheObj[key]
    })
  }
}, GC_TIMEOUT)

const callWithCache = <A extends Hashable[], R>(
  fn: (...args: A) => R,
  args: A,
  {expiry, maxEntries, cacheObj, extendKey}: CacheOptions
): R => {
  const hash = hashArgs([{args, ...(extendKey ? {e: extendKey()} : {})}])
  const now = Date.now()

  if (!cacheObj[hash] || cacheObj[hash].timestamp < now) {
    const data = fn(...args)
    cacheObj[hash] = {
      timestamp: expiry,
      data:
        data instanceof Promise
          ? data.catch((e) => {
              delete cacheObj[hash]
              return Promise.reject(e)
            })
          : data,
      lastAccessed: now,
    }
  } else {
    cacheObj[hash].lastAccessed = now
  }
  const result = cacheObj[hash].data

  // garbage collect
  throttledGC({maxEntries}, cacheObj)

  return result
}

export const cacheResults: CacheResultsFn =
  (opts, cacheObj = {}) =>
  (fn) => {
    const {maxAge, maxEntries, extendKey} =
      typeof opts !== 'number' ? opts : {maxAge: opts, maxEntries: undefined, extendKey: undefined}
    return (...args) =>
      callWithCache(fn, args, {expiry: Date.now() + maxAge, maxEntries, cacheObj, extendKey})
  }

export const cacheResultsWithOptions: CacheResultsWithOptionsFn =
  ({maxAge = Infinity, maxEntries, extendKey} = {}, cacheObj = {}) =>
  (fn) => {
    return ({expiry}) =>
      (...args) =>
        callWithCache(fn, args, {
          expiry: Math.min(expiry, Date.now() + maxAge),
          maxEntries,
          cacheObj,
          extendKey,
        })
  }

type CacheResultsFn = (
  opts: {maxAge: number; maxEntries?: number; extendKey?: () => Hashable} | /* deprecated */ number,
  cacheObj?: CacheObject
) => <A extends Hashable[], R>(fn: (...args: A) => R) => (...args: A) => R

type CacheResultsWithOptionsFn = (
  opts?: {maxAge?: number; maxEntries?: number; extendKey?: () => Hashable},
  cacheObj?: CacheObject
) => <A extends Hashable[], R>(fn: (...args: A) => R) => (opts: {expiry: number}) => (...args: A) => R
