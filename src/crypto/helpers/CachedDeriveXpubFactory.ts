import {derivePublic as deriveChildXpub} from 'cardano-crypto.js'

import {UnexpectedError, UnexpectedErrorReason} from '@/errors'
import {HARDENED_THRESHOLD, isShelleyPath} from '@/ledger/address'
import {BIP32Path} from '@/types/address'

import indexIsHardened from './indexIsHardened'

export function CachedDeriveXpubFactory(
  derivationScheme,
  shouldExportPubKeyBulk,
  deriveXpubsHardenedFn
) {
  const derivedXpubs = {}

  async function deriveXpub(absDerivationPath: BIP32Path): Promise<Buffer> {
    const memoKey = JSON.stringify(absDerivationPath)

    if (!derivedXpubs[memoKey]) {
      const deriveHardened =
        absDerivationPath.length === 0 || indexIsHardened(absDerivationPath.slice(-1)[0])

      /*
       * we create pubKeyBulk only if the derivation path is from shelley era
       */

      if (deriveHardened) {
        const derivationPaths = (
          shouldExportPubKeyBulk && isShelleyPath(absDerivationPath)
            ? createPathBulk(absDerivationPath)
            : [absDerivationPath]
        ).filter(isShelleyPath)
        const pubKeys = await _deriveXpubsHardenedFn(derivationPaths)
        Object.assign(derivedXpubs, pubKeys)
      } else {
        derivedXpubs[memoKey] = await deriveXpubNonhardenedFn(absDerivationPath)
      }
    }

    /*
     * we await the derivation of the key so in case the derivation fails
     * the key is not added to the cache
     * this approach depends on the key derivation happening sychronously
     */

    return derivedXpubs[memoKey]
  }

  async function deriveXpubNonhardenedFn(derivationPath: BIP32Path) {
    const lastIndex = derivationPath.slice(-1)[0]
    const parentXpub = await deriveXpub(derivationPath.slice(0, -1))
    return deriveChildXpub(parentXpub, lastIndex, derivationScheme.ed25519Mode)
  }

  function* makeBulkAccountIndexIterator() {
    yield [0, 4]
    yield [5, 16]
    for (let i = 17; true; i += 18) {
      yield [i, i + 17]
    }
  }

  function getAccountIndexExportInterval(accountIndex: number): [number, number] {
    const bulkAccountIndexIterator = makeBulkAccountIndexIterator()
    for (const [startIndex, endIndex] of bulkAccountIndexIterator) {
      if (accountIndex >= startIndex && accountIndex <= endIndex) {
        return [startIndex, endIndex]
      }
    }
    throw new UnexpectedError(UnexpectedErrorReason.BulkExportCreationError)
  }

  function createPathBulk(derivationPath: BIP32Path): BIP32Path[] {
    const paths: BIP32Path[] = []
    const accountIndex = derivationPath[2] - HARDENED_THRESHOLD
    const [startIndex, endIndex] = getAccountIndexExportInterval(accountIndex)

    for (let i = startIndex; i <= endIndex; i += 1) {
      const nextAccountIndex = i + HARDENED_THRESHOLD
      const nextAccountPath = [...derivationPath.slice(0, -1), nextAccountIndex]
      paths.push(nextAccountPath)
    }

    return paths
  }

  /*
   * on top of the original deriveXpubHardenedFn this is priming
   * the cache of derived keys to minimize the number of prompts on hardware wallets
   */
  async function _deriveXpubsHardenedFn(derivationPaths: BIP32Path[]): Promise<any> {
    const xPubBulk = await deriveXpubsHardenedFn(derivationPaths)
    const _derivedXpubs = {}
    xPubBulk.forEach((xpub: Buffer, i: number) => {
      const memoKey = JSON.stringify(derivationPaths[i])
      _derivedXpubs[memoKey] = xpub
    })
    return _derivedXpubs
  }

  return deriveXpub
}
