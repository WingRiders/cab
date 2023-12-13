import {chain} from 'lodash'

import {OrderedTokenBundle} from '@/types/asset'
import {AssetQuantity, TokenBundle} from '@/types/base'

// from adalite-backend

export const arraySum = (numbers: Array<AssetQuantity>): AssetQuantity =>
  numbers.reduce((acc, val) => acc.plus(val), new AssetQuantity(0))

const aggregateTokenBundlesForPolicy = (policyGroup: TokenBundle, policyId: string) =>
  chain(policyGroup)
    .groupBy(({assetName}) => assetName)
    .map((assetGroup, assetName) => ({
      policyId,
      assetName,
      quantity: arraySum(assetGroup.map((asset) => asset.quantity)),
    }))
    .value()

export const aggregateTokenBundles = (tokenBundle: TokenBundle[]): TokenBundle =>
  chain(tokenBundle)
    .filter((token) => !!token.length)
    .flatten()
    .groupBy(({policyId}) => policyId)
    .map(aggregateTokenBundlesForPolicy)
    .flatten()
    .filter((token) => !token.quantity.isZero())
    .value()

// we need to order the tokenBundle canonically to ensure the same order of tokens is passed to
// ledger/trezor as is returned from the cbor encoder
export const orderTokenBundle = (tokenBundle: TokenBundle): OrderedTokenBundle => {
  const compareStringsCanonically = (string1: string, string2: string) =>
    string1.length - string2.length || Buffer.from(string1, 'hex').compare(Buffer.from(string2, 'hex'))
  return chain(tokenBundle)
    .orderBy(['policyId', 'assetName'], ['asc', 'asc'])
    .groupBy(({policyId}) => policyId)
    .mapValues((tokens) => tokens.map(({assetName, quantity}) => ({assetName, quantity})))
    .map((tokens, policyId) => ({
      policyId,
      assets: tokens.sort((token1, token2) =>
        compareStringsCanonically(token1.assetName, token2.assetName)
      ),
    }))
    .sort((token1, token2) => compareStringsCanonically(token1.policyId, token2.policyId))
    .value()
}

export const getTokenBundlesDifference = (
  tokenBundle1: TokenBundle,
  tokenBundle2: TokenBundle
): TokenBundle => {
  const negativeTokenBundle = tokenBundle2.map((token) => ({
    ...token,
    quantity: token.quantity.negated(),
  }))
  return aggregateTokenBundles([tokenBundle1, negativeTokenBundle])
}
