import {sortBy} from 'lodash'

import {MintScript} from '@/types/txPlan'

export const orderMintScripts = (mintScripts: MintScript[]): MintScript[] =>
  sortBy(mintScripts, ({tokenBundle}) => tokenBundle[0].policyId.toLowerCase())
