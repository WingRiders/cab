import {flatten, isNil} from 'lodash'

import {MAX_ADDRESS_SUMMARY_COUNT, MAX_FETCHABLE_SHELLEY_ADDRESSES, PAGINATION_LIMIT} from '@/constants'
import {CabInternalError as InternalError, CabInternalErrorReason as InternalErrorReason} from '@/errors'
import {makeNonNullable, utxoId} from '@/helpers'
import {cacheResults} from '@/helpers/cacheResults'
import {range} from '@/helpers/range'
import {request} from '@/helpers/request'
import {spendingHashFromAddress} from '@/ledger/address'
import {parseFromSchemaJson} from '@/ledger/plutus'
import {Address, AssetQuantity, HexString, ILogger, Lovelace} from '@/types/base'
import {
  BestSlotResponse,
  BulkAddressesSummary,
  BulkAddressesSummaryResponse,
  BulkAddressesUsed,
  IBlockchainExplorer,
  StakingInfoResponse,
  TxBlockInfo,
  TxSubmission,
  UTxOResponse,
} from '@/types/blockchainExplorer'
import {NullableProtocolParameters, ProtocolParameters} from '@/types/protocolParameters'
import {HostedPoolMetadata} from '@/types/stakepool'
import {TxOutputId, UTxO} from '@/types/transaction'

import {throwIfEpochBoundary} from '../helpers/epochBoundaryUtils'

class DummyBlockchainExplorerLogger implements ILogger {
  log() {} // eslint-disable-line no-empty-function
  info() {} // eslint-disable-line no-empty-function
  warn() {} // eslint-disable-line no-empty-function
  error() {} // eslint-disable-line no-empty-function
  debug() {} // eslint-disable-line no-empty-function
}

type BlockchainExplorerParams = {
  baseUrl: string
  recommendedPoolHash?: string
  gapLimit?: number
  logger?: ILogger
}

export class BlockchainExplorer implements IBlockchainExplorer {
  gapLimit: number
  baseUrl: string
  logger: ILogger
  recommendedPoolHash: string
  private _getAddressInfos: (addresses: Array<string>) => Promise<BulkAddressesSummary | undefined>
  private _getAddressesUsed: (addresses: Array<string>) => Promise<BulkAddressesUsed>

  constructor({baseUrl, logger, recommendedPoolHash = ''}: BlockchainExplorerParams) {
    this.baseUrl = baseUrl
    this.recommendedPoolHash = recommendedPoolHash
    this.logger = logger || new DummyBlockchainExplorerLogger()
    this._getAddressInfos = cacheResults(5000)(this._fetchBulkAddressInfo.bind(this))
    this._getAddressesUsed = cacheResults(5000)(this._fetchBulkAddressesUsed.bind(this))
  }

  async _fetchBulkAddressInfo(addresses: Array<string>): Promise<BulkAddressesSummary | undefined> {
    const url = `${this.baseUrl}/api/bulk/addresses/summary`
    const result: BulkAddressesSummaryResponse = await request(url, 'POST', JSON.stringify(addresses), {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    })
    // TODO, handle 'Left'
    return 'Right' in result ? result.Right : undefined
  }

  async _fetchBulkAddressesUsed(addresses: Array<string>): Promise<BulkAddressesUsed> {
    const chunks = range(0, Math.ceil(addresses.length / MAX_ADDRESS_SUMMARY_COUNT))
    const url = `${this.baseUrl}/api/bulk/addresses/used`
    const results = flatten(
      await Promise.all(
        chunks.map(async (index) => {
          const beginIndex = index * MAX_ADDRESS_SUMMARY_COUNT
          const result: BulkAddressesUsed = await request(
            url,
            'POST',
            JSON.stringify(addresses.slice(beginIndex, beginIndex + MAX_ADDRESS_SUMMARY_COUNT)),
            {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            }
          )
          return result
        })
      )
    )
    return results
  }

  async fetchTxBlockInfo(txHash: string): Promise<TxBlockInfo | null> {
    const url = `${this.baseUrl}/api/tx/block/${txHash}`
    try {
      return (await request(url)) as TxBlockInfo
    } catch (e) {
      return null
    }
  }

  async isSomeAddressUsed(addresses: Array<string>): Promise<boolean> {
    const addressesUsed = await this._getAddressesUsed(addresses)
    return addressesUsed.some((entry) => entry.isUsed)
  }

  async filterUsedAddresses(addresses: Array<string>): Promise<Set<string>> {
    const addressesUsed = await this._getAddressesUsed(addresses)
    const usedAddresses = new Set<string>(
      addressesUsed.filter((entry) => entry.isUsed).map((entry) => entry.address)
    )
    return usedAddresses
  }

  async submitTxRaw(txHash: string, txBody: string): Promise<TxSubmission> {
    const response = await fetch(`${this.baseUrl}/api/v2/txs/signed`, {
      method: 'POST',
      body: JSON.stringify({
        signedTx: Buffer.from(txBody, 'hex').toString('base64'),
        txHash,
      }),
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    }).catch(() => {
      throwIfEpochBoundary()
      throw new InternalError(InternalErrorReason.ServerError)
    })

    if (response.status === 200) {
      return {txHash}
    }

    const errorMessage = await response.json()

    if (response.status === 400) {
      throw new InternalError(InternalErrorReason.TransactionRejectedByNetwork, {
        message: errorMessage.message,
      })
    }

    if (response.status === 504) {
      // TODO: Jakub Arbet - Not sure if this still holds after removing dependency
      //                     from server and talking directly to explorer
      // Usually happens when a gateway timeout is received from the adalite-backend
      // where a gateway-timeout is sent from the load balancer after the backend not
      // responding for too long (~20 seconds).
      // The backend itself may still be trying to submit the transaction though
      // with eventual success.
      //
      // context: https://github.com/input-output-hk/cardano-wallet/issues/2963
      // but we are using cardano-submit-api,
      // so it might not hold TODO https://vacuum.atlassian.net/browse/DEX-150
      throw new InternalError(InternalErrorReason.TransactionSubmissionTimedOut, {
        message: txHash,
      })
    }

    throw new InternalError(InternalErrorReason.ServerError, errorMessage)
  }

  async fetchUnspentTxOutputs(addresses: Array<Address>): Promise<UTxO[]> {
    const uniqueShelleyPubKeys = [
      ...new Set<string>(addresses.map((address) => spendingHashFromAddress(address))),
    ]

    if (uniqueShelleyPubKeys.length === 0) {
      return []
    }

    const chunks = range(0, Math.ceil(uniqueShelleyPubKeys.length / MAX_FETCHABLE_SHELLEY_ADDRESSES))
    const shelleyUtxos: UTxO[] = (
      await Promise.all(
        chunks.map(async (index) => {
          const beginIndex = index * MAX_FETCHABLE_SHELLEY_ADDRESSES
          const fetchableShelleyPubKeys = uniqueShelleyPubKeys.slice(
            beginIndex,
            beginIndex + MAX_FETCHABLE_SHELLEY_ADDRESSES
          )
          let lastSeenTxo
          let responseCount = 0
          let responseUtxos: UTxO[] = []

          do {
            const response = await this.fetchUnspentTxOutputsShelley(
              fetchableShelleyPubKeys,
              PAGINATION_LIMIT,
              lastSeenTxo
            )
            responseCount = response.data.length
            lastSeenTxo = response.lastSeenTxo
            responseUtxos = responseUtxos.concat(response.data)
          } while (responseCount === PAGINATION_LIMIT)
          return responseUtxos
        })
      )
    ).flat()

    return shelleyUtxos
  }

  private async fetchUnspentTxOutputsShelley(
    pubKeys: Array<string>,
    limit: number,
    lastSeenTxo?: TxOutputId
  ): Promise<{data: UTxO[]; lastSeenTxo?: TxOutputId}> {
    const url = `${this.baseUrl}/api/bulk/credentials/utxo`

    const response = await request(
      url,
      'POST',
      JSON.stringify({
        paymentCredentials: pubKeys,
        limit,
        lastSeenTxo,
      }),
      {
        'Content-Type': 'application/json',
      }
    )

    const utxos: UTxO[] = response.map((utxo: UTxOResponse): UTxO => {
      let datum
      try {
        datum = utxo.cuDatumValue !== undefined ? parseFromSchemaJson(utxo.cuDatumValue) : undefined
      } catch (err) {
        datum = utxo.cuDatumValue
      }
      return {
        txHash: utxo.cuId,
        address: utxo.cuAddress as Address,
        outputIndex: utxo.cuOutIndex,
        coins: new Lovelace(utxo.cuCoins.getCoin, 10) as Lovelace,
        tokenBundle: utxo.cuCoins.getTokens.map((token) => ({
          ...token,
          quantity: new AssetQuantity(token.quantity, 10),
        })),
        ...(!isNil(utxo.hasInlineScript) ? {hasInlineScript: utxo.hasInlineScript} : undefined),
        ...(!isNil(datum) ? {datum} : undefined),
        ...(!isNil(utxo.cuDatumHash) ? {datumHash: utxo.cuDatumHash} : undefined),
      }
    })

    return {
      data: utxos,
      lastSeenTxo: utxos.length > 0 ? utxoId(utxos[utxos.length - 1]) : lastSeenTxo,
    }
  }

  async getPoolInfo(url: string): Promise<HostedPoolMetadata | null> {
    const response: {Left: any} | {Right: HostedPoolMetadata} = await request(
      `${this.baseUrl}/api/poolMeta`,
      'POST',
      JSON.stringify({poolUrl: url}),
      {
        'Content-Type': 'application/json; charset=utf-8',
      }
    ).catch(() => {
      return null
    })
    return 'Right' in response ? response.Right : null
  }

  async getStakingInfo(stakingKeyHashHex: HexString): Promise<StakingInfoResponse> {
    const url = `${this.baseUrl}/api/account/info/${stakingKeyHashHex}`
    const response = await request(url)
    // if we fail to recieve poolMeta from backend
    // TODO: IMHO we shouldn't freestyle append poolInfo here, it breaks types easily
    if (response.delegation.url && !response.delegation.name) {
      const poolInfo = await this.getPoolInfo(response.delegation.url)
      return {
        ...response,
        delegation: {
          ...response.delegation,
          ...poolInfo,
        },
      }
    }
    return response
  }

  getBestSlot(): Promise<BestSlotResponse> {
    return request(`${this.baseUrl}/api/v2/bestSlot`)
  }

  async getProtocolParameters(): Promise<ProtocolParameters> {
    const protocolParameters: NullableProtocolParameters = await request(
      `${this.baseUrl}/api/v2/protocolParameters`
    )
    return makeNonNullable(protocolParameters)
  }
}
