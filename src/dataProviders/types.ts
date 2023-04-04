/**
 * Defines data points needed from blockchain inside CAB and their respective
 * providers. They are split into multiple providers to enable more granular
 * separation on backend into multiple services if needed. Currently we have:
 *
 * * OnChainDataProvider - for getting UTxOs and used addresses
 * * LedgerStateDataProvider - protocolParameters, ledgerTip and staking info
 * * StakepoolDataProvider - repo for registered stake pools and their metadata
 * * SubmitTxProvider - endpoint through which transactions can be submitted
 */

import {Address, Lovelace} from '../types/base'
import {ProtocolParameters} from '../types/protocolParameters'
import {Stakepool} from '../types/stakepool'
import {UTxO} from '../types/transaction'

/**
 * XOR filter for UTxOs based on either:
 * * address - bech32 address format
 * * paymentCredential - pubkey or script hash
 * * stakingCredential - pubkey or script hash
 */
export type UTxOFilter =
  | {
      addresses: Address[]
      paymentCredentials?: never
      stakingCredentials?: never
    }
  | {
      addresses?: never
      paymentCredentials: string[]
      stakingCredentials?: never
    }
  | {
      addresses?: never
      paymentCredentials?: never
      stakingCredentials: string[]
    }

export type TxBlockInfo = {
  txHash: string
  creationTime: string
  blockHeight: number
  blockEpoch: number
  blockSlot: number
  blockHash: string
}

/**
 * Defines an interface for onchain data provider. Onchain data originates only
 * from onchain transactions. Currently this interface only allows to get UTxOs
 * and used addresses. Other onchain data is currently not needed by CAB.
 */
export interface IOnChainDataProvider {
  /**
   * @returns UTxOs matching the specified filter
   * @throws Error in case the request to the backend service fails
   */
  getUTxOs(filter: UTxOFilter): Promise<UTxO[]>

  /**
   * @returns UTxO matching specified txHash and outputIndex
   * @throws Error in case the request to the backend service fails,
   *         or the UTxO doesn't exist
   */
  getUTxO(filter: {txHash: string; outputIndex: number}): Promise<UTxO>

  /**
   * @returns Subset of addresses that are used. Used address is such address
   *          that has/had a UTxO on it.
   * @throws {CabInternalError} in case the request to the backend service fails
   */
  filterUsedAddresses(addresses: Address[]): Promise<Set<Address>>

  /**
   * @returns Information about a transaction on the blockchain, or null if the
   *          transaction is not found.
   */
  getTxBlockInfo(txHash: string): Promise<TxBlockInfo | null>
}

export type StakingInfo =
  | {isStakeKeyRegistered: false}
  | {isStakeKeyRegistered: true; stakePoolHash?: string; rewards: Lovelace}

/**
 * Defines an interface to get a subset of ledger state data. The subset is
 * what CAB internally needs - can be expanded in the future
 *
 * TODO: Possible improvement - add genesis config endpoint and replace hardcoded
 *       genesis values (used for example in slot<->date translation)
 */
export interface ILedgerStateDataProvider {
  getStakeKeyInfo(stakeKeyHash: string): Promise<StakingInfo>
  getLedgerTip(): Promise<{origin: true} | {origin: false; slot: number}>
  getProtocolParameters(): Promise<ProtocolParameters>
}

export type TxSubmission = {txHash: string}

export interface ISubmitTxProvider {
  /**
   * Blocking submission of transaction to the Cardano blockchain
   *
   * @throws {CabInternalError} if the submission fails either due to network
   *         error or if the transaction doesn't pass onChain validation
   */
  submitTx({txBody, txHash}: {txBody: string; txHash: string}): Promise<TxSubmission>
}

/**
 * Defines an interface of a repository of available stakepools with their
 * metadata. Can be queried by the stake pool's ticker or hash.
 * The methods are not defined as async as this data provider should be ideally
 * initialled once with the data and then just respond synchronously to queries
 */
export interface IStakepoolDataProvider {
  /** Returns all loaded stakepools */
  getStakepools(): IterableIterator<Stakepool>

  /**
   * Multiple pools can share the same ticker. Therefore this returns list of
   * all stake pools matching the specified ticker.
   */
  getPoolInfoByTicker(ticker: string): Stakepool[]
  getPoolInfoByPoolHash(poolHash: string): Stakepool | undefined
}
