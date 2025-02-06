// 'isomorphic-fetch' needs to be imported as global for mocking to work
// https://www.wheresrhys.co.uk/fetch-mock/docs/fetch-mock/Troubleshooting/#fetch-doesnt-seem-to-be-getting-mocked
import 'isomorphic-fetch'

import {PointOrOrigin, RewardAccountSummary, Utxo as OgmiosUTxO} from '@cardano-ogmios/schema'
import {parse} from 'json-bigint'

import {MAX_URL_LENGTH} from '@/constants'
import {chunkAddresses} from '@/dataProvider/chunkAddresses'
import {CabInternalError, CabInternalErrorReason} from '@/errors'
import {parseOgmiosProtocolParameters} from '@/helpers'
import {getCurrentEpochFactory} from '@/helpers/epochHelpersFactories'
import {getLogger} from '@/logger'
import {
  Address,
  BigNumber,
  Lovelace,
  NetworkName,
  OGMIOS_LANGUAGE_TO_LANGUAGE,
  ProtocolParameters,
  UTxO,
} from '@/types'

// Type utility to convert bigint response to number or BigNumber as parsed with json-bigint
type Convert<U, V, O extends object> = {
  [K in keyof O]: O[K] extends object ? Convert<U, V, O[K]> : O[K] extends U ? V : O[K]
}

// Generic DataProvider interface for accessing on-chain data
export abstract class DataProvider {
  abstract getHealth(): Promise<{
    healthy: boolean
    networkSlot: number
    ledgerSlot: number
    lastBlockSlot: number
    uptime: number
  }>

  abstract getProtocolParameters(): Promise<ProtocolParameters>

  abstract getLedgerTip(): Promise<PointOrOrigin>

  abstract getUTxOs(addresses: Array<string>): Promise<UTxO[]>

  abstract getRewardAccountSummary(
    stakeKeyHash: string
  ): Promise<Convert<bigint, number | BigNumber, RewardAccountSummary> | null>

  abstract getUsedAddresses(stakeKeyHash: string): Promise<string[]>

  abstract filterUsedAddresses(addresses: Address[]): Promise<Set<Address>>

  abstract getTxInfo(
    txHash: string
  ): Promise<{txHash: string; slot: number; block: {height: number; hash: string}} | null>

  async getTxBlockHeight(txHash: string): Promise<number | null> {
    const txInfo = await this.getTxInfo(txHash)
    return txInfo?.block?.height ?? null
  }

  abstract submitTx(txCbor: string): Promise<void>
}

type UTxOResponse = Convert<bigint, number | BigNumber, OgmiosUTxO[number]>

const mapUTxO = (utxo: UTxOResponse): UTxO => ({
  txHash: utxo.transaction.id,
  outputIndex: utxo.index,
  address: utxo.address as Address,
  coins: new Lovelace(utxo.value.ada.lovelace) as Lovelace,
  tokenBundle: Object.entries(utxo.value)
    .filter(([key]) => key !== 'ada')
    .flatMap(([policyId, tokens]) =>
      Object.entries(tokens).map(([assetName, quantity]) => ({
        policyId,
        assetName,
        quantity: new BigNumber(quantity),
      }))
    ),
  ...(utxo.datumHash ? {datumHash: utxo.datumHash} : {}),
  ...(utxo.datum !== undefined ? {inlineDatum: true} : {}),
  ...(utxo.datum !== undefined ? {datum: utxo.datum} : {}),
  ...(utxo.script !== undefined ? {hasInlineScript: true} : {}),
  ...(utxo.script && utxo.script.language !== 'native'
    ? {
        inlineScript: {
          language: OGMIOS_LANGUAGE_TO_LANGUAGE[utxo.script.language],
          bytes: Buffer.from(utxo.script.cbor, 'hex'),
        },
      }
    : {}),
})

const assertOk = async (res: Response, url: string) => {
  if (!res.ok) {
    throw new Error(`Error fetching ${url}: ${await res.text()}`)
  }
}

export class CabBackend extends DataProvider {
  private protocolParameters: {
    data: ProtocolParameters
    fetchedInEpoch: number
  } | null

  constructor(private url: string, private networkName: NetworkName) {
    super()
    this.protocolParameters = null
  }

  async getHealth(): Promise<{
    healthy: boolean
    networkSlot: number
    ledgerSlot: number
    lastBlockSlot: number
    uptime: number
  }> {
    const url = `${this.url}/healthcheck`
    const res = await fetch(url)
    await assertOk(res, url)
    return await res.json()
  }

  async getProtocolParameters(): Promise<ProtocolParameters> {
    const currentEpoch = getCurrentEpochFactory(this.networkName)()
    if (this.protocolParameters && this.protocolParameters.fetchedInEpoch === currentEpoch) {
      return Promise.resolve(this.protocolParameters.data)
    }
    try {
      const url = `${this.url}/protocolParameters`
      const res = await fetch(url)
      await assertOk(res, url)
      const json: any = await res.json()
      const protocolParameters: ProtocolParameters = parseOgmiosProtocolParameters(json)
      this.protocolParameters = {
        data: protocolParameters,
        fetchedInEpoch: currentEpoch,
      }
      return protocolParameters
    } catch (err) {
      throw new CabInternalError(CabInternalErrorReason.NetworkError, {causedBy: err})
    }
  }

  async getLedgerTip(): Promise<PointOrOrigin> {
    const url = `${this.url}/ledgerTip`
    const res = await fetch(url)
    await assertOk(res, url)
    return await res.json()
  }

  async getUTxOs(addresses: Array<string>): Promise<UTxO[]> {
    const baseUrl = `${this.url}/utxos?addresses=`
    const addressChunks = chunkAddresses(addresses, MAX_URL_LENGTH - baseUrl.length)

    // Fetch UTxOs sequentially for each chunk (cab-backend returns 502 when making 4 parallel calls)
    const allUTxOs: UTxO[] = []
    getLogger().debug(
      `Fetching UTxOs with ${addresses.length} addresses, in ${addressChunks.length} chunks`
    )
    for (const addressChunk of addressChunks) {
      getLogger().debug(`Chunk with ${addressChunk.length} addresses start`)
      const url = `${baseUrl}${addressChunk.join(',')}`
      const res = await fetch(url)
      await assertOk(res, url)
      getLogger().debug({status: res.status}, `Chunk with ${addressChunk.length} addresses fetched`)
      const text = await res.text()
      const utxos: any = await parse(text)
      getLogger().debug(`Parsed ${utxos.length} UTxOs`)
      allUTxOs.push(...utxos.map(mapUTxO))
    }
    getLogger().debug(`Fetched ${allUTxOs.length} UTxOs`)
    return allUTxOs
  }

  async getRewardAccountSummary(
    stakeKeyHash: string
  ): Promise<Convert<bigint, number | BigNumber, RewardAccountSummary> | null> {
    const url = `${this.url}/rewardAccountSummary/${stakeKeyHash}`
    const res = await fetch(url)
    if (res.status === 404) return null
    await assertOk(res, url)
    const text: string = await res.text()
    return await parse(text)
  }

  async getUsedAddresses(stakeKeyHash: string): Promise<string[]> {
    const url = `${this.url}/addresses/${stakeKeyHash}`
    const res = await fetch(url)
    await assertOk(res, url)
    return await res.json()
  }

  async filterUsedAddresses(addresses: Address[]): Promise<Set<Address>> {
    const url = `${this.url}/filterUsedAddresses`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({addresses}),
    })
    await assertOk(res, url)
    const usedAddresses: any = await res.json()
    return new Set(usedAddresses as Address[])
  }

  async getTxInfo(
    txHash: string
  ): Promise<{txHash: string; slot: number; block: {height: number; hash: string}} | null> {
    const url = `${this.url}/transaction/${txHash}`
    const res = await fetch(url)
    if (res.status === 404) return null
    await assertOk(res, url)
    return res.json()
  }

  async submitTx(txCbor: string): Promise<void> {
    const res = await fetch(`${this.url}/submitTx`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({transactionCbor: txCbor}),
    })
    if (!res.ok) {
      throw new Error(`CAB: Failed to submit transaction: ${await res.text()}`)
    }
  }
}
