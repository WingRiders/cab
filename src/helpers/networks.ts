import {NetworkId, NetworkName} from '@/types'

export const networkNameToNetworkId: {[k in NetworkName]: NetworkId} = {
  [NetworkName.MAINNET]: NetworkId.MAINNET,
  [NetworkName.PREPROD]: NetworkId.PREPROD,
}

export const networkIdToNetworkName: {[k in NetworkId]: NetworkName} = {
  [NetworkId.MAINNET]: NetworkName.MAINNET,
  [NetworkId.PREPROD]: NetworkName.PREPROD,
}
