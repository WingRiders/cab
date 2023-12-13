import {Network, NetworkId, NetworkName, ProtocolMagic} from '@/types/network'

export const NETWORKS: Record<NetworkName, Network> = {
  [NetworkName.MAINNET]: {
    name: NetworkName.MAINNET,
    networkId: NetworkId.MAINNET,
    protocolMagic: ProtocolMagic.MAINNET,
    eraStartSlot: 4492800, // 21600 slot x 208 epochs
    eraStartDateTime: Date.parse('29 Jul 2020 21:44:51 UTC'),
    epochsToRewardDistribution: 4,
    minimalOutput: 1000000,
    slotLength: 1,
    epoch0: 1506203091,
    byronSlotSeconds: 20,
    shelleySlotSeconds: 1,
    epochSlots: 432000,
    shelleyInitialSlot: 4492800,
    shelleyInitialEpoch: 208,
  },
  [NetworkName.PREPROD]: {
    name: NetworkName.PREPROD,
    networkId: NetworkId.PREPROD,
    protocolMagic: ProtocolMagic.PREPROD,
    eraStartSlot: 86400,
    eraStartDateTime: Date.parse('2021-06-21T00:00:00Z'),
    epochsToRewardDistribution: 4,
    minimalOutput: 1000000,
    slotLength: 1,
    epoch0: 1654041600,
    byronSlotSeconds: 20,
    shelleySlotSeconds: 1,
    epochSlots: 432000,
    shelleyInitialSlot: 86400,
    shelleyInitialEpoch: 4,
  },
}
