import {Asset, AssetQuantity, BigNumber, Token} from '@/types'

export const parseToken = (token: Asset & {quantity: string}): Token => ({
  ...token,
  quantity: new AssetQuantity(token.quantity),
})

export const withQuantity = (asset: Asset, quantity: BigNumber.Value | bigint): Token => ({
  ...asset,
  quantity: new AssetQuantity(`${quantity}`),
})
