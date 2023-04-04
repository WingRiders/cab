export enum NetworkId {
  Mainnet = 1,
  Testnet = 0,
}

export enum APIErrorCode {
  /**
   * Inputs do not conform to this spec or are otherwise invalid.
   */
  InvalidRequest = -1,
  /**
   * An error occurred during execution of this API call.
   */
  InternalError = -2,
  /**
   * The request was refused due to lack of access - e.g. wallet disconnects.
   */
  Refused = -3,
  /**
   * The account has changed. The dApp should call `wallet.enable()` to reestablish connection
   * to the new account. The wallet should not ask for confirmation as the user was the one
   * who initiated the account change in the first place.
   */
  AccountChange = -4,
}
export interface APIError {
  code: APIErrorCode
  info: string
}

export enum DataSignErrorCode {
  /**
   * Wallet could not sign the data (e.g. does not have the secret key associated with the address)
   */
  ProofGeneration = 1,
  /**
   * Address was not a P2PK address and thus had no SK associated with it.
   */
  AddressNotPK = 2,
  /**
   * User declined to sign the data
   */
  UserDeclined = 3,
  /**
   * If a wallet enforces data format requirements,
   * this error signifies that the data did not conform to valid formats.
   */
  InvalidFormat = 4,
}
export interface DataSignError {
  code: DataSignErrorCode
  info: string
}

export enum TxSignErrorCode {
  /**
   * User has accepted the transaction sign, but the wallet was unable to sign the transaction
   * (e.g. not having some of the private keys)
   */
  ProofGeneration = 1,
  /**
   * User declined to sign the transaction
   */
  UserDeclined = 2,
}
export interface TxSignError {
  code: TxSignErrorCode
  info: string
}

export enum TxSendErrorCode {
  /**
   * Wallet refuses to send the tx (could be rate limiting)
   */
  Refused = 1,
  /**
   * Wallet could not send the tx
   */
  Failure = 2,
}
export interface TxSendError {
  code: TxSendErrorCode
  info: string
}

/**
 * `maxSize` is the maximum size for pagination and if the dApp
 * tries to request pages outside of this boundary this error is thrown.
 */
export interface PaginateError {
  maxSize: number
}

export type SignTxSummary = {
  message?: string
  metadata?: unknown
  summaryFields?: Array<{
    name: string
    type: string
    value: string | string[]
  }>
}

export type HexString = string & {__encoding: 'hex'}

/**
 * Used to specify optional pagination for some API calls.
 * Limits results to {limit} each page, and uses a 0-indexing {page}
 * to refer to which of those pages of {limit} items each.
 * dApps should be aware that if a wallet is modified between
 * paginated calls that this will change the pagination,
 * e.g. some results skipped or showing up multiple times but otherwise
 * the wallet must respect the pagination order.
 */
export type Paginate = {
  page: number
  limit: number
}
