import {AdaAsset} from '@/constants'
import {HexString} from '../types'

export const isAda = ({policyId, assetName}: {policyId: HexString; assetName: HexString}) =>
  policyId === AdaAsset.policyId && assetName === AdaAsset.assetName
