import {Asset, Token} from '@/types/base'

export const tokenToAsset = (token: Token): Asset => ({
  policyId: token.policyId,
  assetName: token.assetName,
})
