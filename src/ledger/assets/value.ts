import {flatMap, map, mapValues, mergeWith} from 'lodash'

import {Value} from '@/types/asset'
import {Asset, AssetQuantity, HexString, Lovelace, Token, TokenBundle} from '@/types/base'

// TODO this is really slow with large utxos, optimize it
export const tokenBundleToValue = (tokenBundle: TokenBundle, coins?: Lovelace): Value =>
  tokenBundle.reduce(
    (result, {assetName, policyId, quantity}) => ({
      ...result,
      [policyId]: {
        ...result[policyId],
        [assetName]: quantity,
      },
    }),
    coins
      ? {
          ['' as HexString]: {
            ['' as HexString]: coins,
          },
        }
      : {}
  )

export const valueToTokenBundle = (
  value: Value,
  {withAda = false, withoutZero = false}: {withAda?: boolean; withoutZero?: boolean} = {}
): TokenBundle =>
  flatMap(value, (byAsset, policyId) =>
    policyId === '' && !withAda
      ? []
      : map(byAsset, (quantity, assetName) => ({
          policyId,
          assetName,
          quantity,
        }))
  ).filter((token) => !(withoutZero && token.quantity.isZero()))

export const valueToLovelace = (value: Value): Lovelace =>
  (value['']?.[''] || new Lovelace(0)) as Lovelace

export const extractAssetValue = (value: Value, asset: Asset): Value => ({
  [asset.policyId]: {
    [asset.assetName]: assetQuantity(value, asset),
  },
})

export const assetQuantity = (value: Value, asset: Asset): AssetQuantity =>
  value[asset.policyId]?.[asset.assetName] || new AssetQuantity(0)

export const setAssetQuantity = (value: Value, asset: Asset, quantity: AssetQuantity): Value => ({
  ...value,
  [asset.policyId]: {
    ...value[asset.policyId],
    [asset.assetName]: quantity,
  },
})

const composeValue = (obj, src, _key, _objO, _srcO, stack) =>
  stack.size === 1 ? (obj ?? new AssetQuantity(0)).plus(src ?? new AssetQuantity(0)) : undefined

export const valueAdd = (...values: Value[]): Value => mergeWith({} as Value, ...values, composeValue)

export const tokenToValue = (token: Token): Value => ({
  [token.policyId]: {
    [token.assetName]: token.quantity,
  },
})

export const assetToValue = (asset: Asset, quantity: AssetQuantity = new AssetQuantity(0)) => ({
  [asset.policyId]: {
    [asset.assetName]: quantity,
  },
})

export const invertValue = (value: Value): Value =>
  mapValues(value, (asset) => mapValues(asset, (quantity) => quantity.negated()))
