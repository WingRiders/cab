import {Token, Asset} from '@/types/base'

export const tokenToAsset = (token: Token): Asset => ({
  policyId: token.policyId,
  assetName: token.assetName,
})
