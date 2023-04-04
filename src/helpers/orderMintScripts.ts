import {MintScript} from '@/types/txPlan'
import {sortBy} from 'lodash'

export const orderMintScripts = (mintScripts: MintScript[]): MintScript[] =>
  sortBy(mintScripts, ({tokenBundle}) => tokenBundle[0].policyId.toLowerCase())
