import {Asset, AssetQuantity, Token} from '@/types'

export const parseToken = (token: Asset & {quantity: string}): Token => ({
  ...token,
  quantity: new AssetQuantity(token.quantity),
})

export const withQuantity = (asset: Asset, quantity: number | bigint | string): Token => ({
  ...asset,
  quantity: new AssetQuantity(`${quantity}`),
})
