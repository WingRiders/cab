import {matchAsset} from '@/ledger/assets/compareAssets'
import {Asset, AssetQuantity, Token, TokenBundle, TokenObject} from '@/types'

export const isNonEmptyTokenBundle = (
  tokenBundle: TokenBundle | null | undefined
): tokenBundle is TokenBundle => !!tokenBundle && tokenBundle.some((token) => !token.quantity.eq(0))

export const invertTokenBundle = (tokenBundle: TokenBundle): TokenBundle =>
  tokenBundle.map((token) => ({...token, quantity: token.quantity.negated()}))

export const getTokenFromBundle = (tokenBundle: TokenBundle, asset: Asset): Token | undefined =>
  tokenBundle.find(matchAsset(asset))

export const tokenObjectsToTokenBundle = (tokenObjects: TokenObject[]): TokenBundle =>
  tokenObjects.map(({policyId, assetName, quantity}) => ({
    policyId,
    assetName,
    quantity: new AssetQuantity(quantity),
  }))

export const tokenBundleToTokenObjects = (tokenBundle: TokenBundle): TokenObject[] =>
  tokenBundle.map(({policyId, assetName, quantity}) => ({
    policyId,
    assetName,
    quantity: quantity.toString(),
  }))
