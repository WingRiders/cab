import compact from 'lodash/compact'
import {request} from '@/helpers'
import {Stakepool} from '@/types'
import {IStakepoolDataProvider} from './types'

export const createStakePoolDataProviderFromCexplorer = async (cexplorerUrl: string) => {
  const stakePoolListResponse: {
    code: number
    time: string
    msg: string
    data: {
      /** bech32 formated pool id */
      pool_id: string
      /** name of the pool in format '[ticker] name' */
      name: string
      /** amount of total stake in the pool */
      stake: string
      /** pool hash - hex */
      pool_id_hash: string
      /** margin fee - percentage 0 - 100 */
      tax_ratio: string
      /** fixed fee */
      tax_fix: string
      /** blocks minted this epoch */
      blocks_epoch: string
      /** total blocks minted in lifetime of stakepool */
      blocks_lifetime: string
      /** return of ada, annulised, stake-weighted, based on staking results from past 10 epochs */
      roa_short: string
      /** return of ada, annulised, stake-weighted, based on lifetime staking results */
      roa_lifetime: string
      /** pledge amount */
      pledge: string
      /** number of delegators (account with live balance minimum od 10 ADA) */
      delegators: string
      /** percentage of saturation, float, 0 - 1 */
      saturation: number
      /** cexplorer url */
      url: string
    }[]
    terms: string
  } = await request(`${cexplorerUrl}/api-static/pool/list.json`)

  const stakepools = stakePoolListResponse.data.map((stakepoolRawData): Stakepool => {
    // try to extract ticker from the name, if it fails default to empty ticker
    const match = stakepoolRawData.name.match(/^\[(.*)\] (.*)$/)
    const [ticker, name] =
      match && match.length === 3 ? [match[1], match[2]] : ['', stakepoolRawData.name]

    return {
      pledge: stakepoolRawData.pledge,
      margin: Number.parseFloat(stakepoolRawData.tax_ratio),
      fixedCost: stakepoolRawData.tax_fix,
      url: stakepoolRawData.url,
      name,
      ticker,
      homepage: stakepoolRawData.url,
      poolHash: stakepoolRawData.pool_id_hash,
    }
  })

  return new StakePoolDataProvider(stakepools)
}

class StakePoolDataProvider implements IStakepoolDataProvider {
  private tickerToPoolHashes: Map<string, string[]>
  private poolHashToStakepool: Map<string, Stakepool>

  constructor(stakepools: Stakepool[]) {
    // prepare a map of ticker to poolHash, account for the fact that tickers might be duplicates
    this.tickerToPoolHashes = stakepools.reduce(
      (map, stakepool) =>
        map.set(stakepool.ticker, [...(map.get(stakepool.ticker) || []), stakepool.poolHash]),
      new Map<string, string[]>()
    )
    this.poolHashToStakepool = new Map(stakepools.map((stakepool) => [stakepool.poolHash, stakepool]))
  }

  getStakepools(): IterableIterator<Stakepool> {
    return this.poolHashToStakepool.values()
  }

  getPoolInfoByTicker(ticker: string): Stakepool[] {
    const poolHashes = this.tickerToPoolHashes.get(ticker)

    return poolHashes ? compact(poolHashes.map((poolHash) => this.getPoolInfoByPoolHash(poolHash))) : []
  }

  getPoolInfoByPoolHash(poolHash: string): Stakepool | undefined {
    return this.poolHashToStakepool.get(poolHash)
  }
}
