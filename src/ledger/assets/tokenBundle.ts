import {Asset, Token, TokenBundle} from '@/types'
import {matchAsset} from '@/ledger/assets/compareAssets'

export const isNonEmptyTokenBundle = (
  tokenBundle: TokenBundle | null | undefined
): tokenBundle is TokenBundle => !!tokenBundle && tokenBundle.some((token) => !token.quantity.eq(0))

export const invertTokenBundle = (tokenBundle: TokenBundle): TokenBundle =>
  tokenBundle.map((token) => ({...token, quantity: token.quantity.negated()}))

export const getTokenFromBundle = (tokenBundle: TokenBundle, asset: Asset): Token | undefined =>
  tokenBundle.find(matchAsset(asset))
