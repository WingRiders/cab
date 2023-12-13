import {AssetQuantity, HexString, Lovelace, TokenBundle} from './base'

export type OrderedTokenBundle = {
  policyId: string
  assets: {
    assetName: string
    quantity: AssetQuantity
  }[]
}[]

export const enum AssetFamily {
  ADA,
  TOKEN,
}

export type Balance = {
  coins: Lovelace
  tokenBundle: TokenBundle
}

export type Value = {
  [policyId: HexString]: {
    [assetName: HexString]: AssetQuantity | Lovelace
  }
}
