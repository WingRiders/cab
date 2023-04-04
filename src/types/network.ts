export enum NetworkId {
  MAINNET = 1,
  PREPROD = 0,
}

export enum NetworkName {
  MAINNET = 'mainnet',
  PREPROD = 'preprod',
}

export enum ProtocolMagic {
  MAINNET = 764824073,
  PREPROD = 1,
}

export type Network = {
  name: NetworkName
  networkId: NetworkId
  protocolMagic: ProtocolMagic
  eraStartSlot: number
  eraStartDateTime: number
  epochsToRewardDistribution: number
  minimalOutput: number
  slotLength: number
  // for slot to date calculation
  epoch0: number
  byronSlotSeconds: number
  shelleySlotSeconds: number
  epochSlots: number
  shelleyInitialSlot: number
  shelleyInitialEpoch: number
}
