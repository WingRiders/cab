import {HexString, NetworkId, Paginate} from './common'

export type CborHexString = HexString & {__type: 'CborHexString'}

/**
 * Follows the standard API from CIP-0030
 */
export interface CborAPI {
  /**
   * Returns the network id of the currently connected account.
   * This result will stay the same unless the connected account has changed.
   *
   * @returns 0 - testnet; 1 - mainnet
   * @throws APIError
   */
  getNetworkId(): Promise<NetworkId>

  /**
   * If `amount` is `undefined`, this shall return a list of all UTXOs
   * (unspent transaction outputs) controlled by the wallet.
   * If `amount` is not `undefined`, this request shall be limited to just the UTXOs
   * that are required to reach the combined ADA/multiasset value target specified
   * in `amount`, and if this cannot be attained, `undefined` shall be returned.
   * The results can be further paginated by `paginate` if it is not `undefined` or empty array.
   *
   * @param value the value encoded with cbor
   *  value = coin | [coin, multiasset<uint>]
   *  coin = uint
   *  multiasset<uint> = { * policy_id => { * asset_name => uint } }
   * @param {Paginate} paginate
   * @returns undefined or array of utxos encoded with cbor
   *   ⚠️ The utxos should be returned in a canonical order
   *   cddl:
   *     utxo = [tx_input, tx_output]
   *     tx_input = [transaction_id: hash32, index: uint]
   *     tx_output = [address, amount: value, ?datum_hash: hash32]
   *
   * @throws APIError, PaginateError
   */
  getUtxos(amount?: CborHexString, paginate?: Paginate): Promise<CborHexString[] | undefined | null>

  /**
   * Returns the total balance available of the wallet.
   * This is the same as summing the results of `api.getUtxos()`,
   * but it is both useful to dApps and likely already maintained by the implementing
   * wallet in a more efficient manner so it has been included in the API as well.
   *
   * @returns the value encoded with cbor
   *  see {@link getUtxos}
   * @throws APIError
   */
  getBalance(): Promise<CborHexString>

  /**
   * Returns a list of all used (included in some on-chain transaction) addresses
   * controlled by the wallet. The results can be further paginated by `paginate`
   * if the return value is not empty or it is not `undefined`.
   *
   * @param {Paginate} paginate
   * @return undefined or array of cbor-encoded addresses
   *   address = bytes
   *   ; address format:
   *   ; [ 8 bit header | payload ]
   *   ; e.g. a base address:
   *   ;  [bits 7-4 0000 | bits 3-0 network id | keyhash28 | keyhash28]
   * @throws APIError
   */
  getUsedAddresses(paginate?: Paginate): Promise<CborHexString[] | undefined | null>

  /**
   * Returns a list of unused addresses controlled by the wallet.
   * @return array of cbor-encoded addresses
   *   see {@link getUsedAddresses}
   * @throws APIError
   */
  getUnusedAddresses(): Promise<CborHexString[]>

  /**
   * Returns an address owned by the wallet that should be used as a change address
   * to return leftover assets during transaction creation back to the connected wallet.
   * ℹ️ This can be used as a generic receive address as well.
   *
   * @returns a cbor-encoded address
   *   see {@link getUsedAddresses}
   * @throws APIError
   */
  getChangeAddress(): Promise<CborHexString>

  /**
   * Returns the reward addresses owned by the wallet.
   * This can return multiple addresses e.g. CIP-0018.
   *
   * @returns array of cbor-encoded reward addresses
   *   see {@link getUsedAddresses}
   * @throws APIError
   */
  getRewardAddresses(): Promise<CborHexString[]>

  /**
   * Requests that a user sign the unsigned portions of the supplied transaction.
   * The wallet should ask the user for permission, and if given, try to sign the supplied body
   * and return a signed transaction. If `partialSign` is true, the wallet only
   * tries to sign what it can. If `partialSign` is false and the wallet could not sign
   * the entire transaction, `TxSignError` shall be returned with the `ProofGeneration` code.
   * Likewise if the user declined in either case it shall return the `UserDeclined` code.
   * Only the portions of the witness set that were signed as a result of this call are
   * returned to encourage dApps to verify the contents returned by this endpoint
   * while building the final transaction.
   *
   * @param tx cbor encoded complete transaction
   *   cddl:
   *     tx = [
   *            transaction_body,
   *            transaction_witness_set,
   *            bool,
   *            auxiliary_data / null
   *         ]
  ]
   * @param partialSign defaults to false
   * @returns partial transaction witness set, only the added parts
   *   cddl relevant parts:
   *     transaction_witness_set = {
   *       ? 0: [* vkeywitness ],
   *       ? 2: [* bootstrap_witness ]
   *     }
   * @throws APIError, TxSignError
   */
  signTx(tx: CborHexString, partialSign?: boolean): Promise<CborHexString>

  /**
   * This endpoint utilizes the [CIP-0008 signing spec](https://github.com/cardano-foundation/CIPs/blob/master/CIP-0008/README.md)
   * for standardization/safety reasons. It allows the dApp to request
   * the user to sign data conforming to said spec. The user's consent should be requested
   * and the details of `sig_structure` shown to them in an informative way.
   * Please refer to the CIP-0008 spec for details on how to construct the sig structure.
   *
   * @param addr cbor encoded address
   *   cddl see {@link getUsedAddresses}
   * @param sigStructure the signing structure encoded with cbor from CIP-0008
   * @return hex-encoded bytes
   *
   * @throws APIError, DataSignError
   */
  signData(addr: CborHexString, sigStructure: CborHexString): Promise<HexString>

  /**
   * As wallets should already have this ability, we allow dApps to request that a transaction
   * be sent through it. If the wallet accepts the transaction and tries to send it, it shall
   * return the transaction id for the dApp to track. The wallet is free to return the `TxSendError`
   * with code `Refused` if they do not wish to send it, or `Failure` if there was an error
   * in sending it (e.g. preliminary checks failed on signatures).
   *
   * @param tx cbor encoded signed transaction
   *   see {@link signTx}
   * @returns hex-encoded 32-bit length hash of the transactions
   *
   * @throws APIError, TxSendError
   */
  submitTx(tx: CborHexString): Promise<HexString>

  /**
   * Returns a list of UTxOs that can be used as collaterals. Under normal circumstances only a single utxo
   * should be returned. Most wallets handle this utxo as a specific case and it does not contribute
   * to the balance and the UTxO won't be returned with the {@link getUtxos}. So care need to be taken
   * wherever using utxos with external wallets.
   *
   * @returns undefined or array of collateral utxos
   *
   * @throws APIError
   */
  getCollateral?(params: {amount: CborHexString}): Promise<CborHexString[] | undefined | null>

  /**
   * 🚧 Experimental endpoints
   */
  experimental?: {
    /** @see {@link getCollateral} */
    getCollateral?: CborAPI['getCollateral']
  }
}
