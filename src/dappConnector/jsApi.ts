import {BigNumber} from 'bignumber.js'
import {HexString, NetworkId, Paginate, SignTxSummary} from './common'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TODO = any

export type Int32 = BigNumber & {__type: 'Int32'}
export type UInt = BigNumber & {__type: 'Uint'}
export type Coin = BigNumber & {__type: 'Coin'}

export type Hash28 = HexString & {__hash: 'Hash28'}
export type Hash32 = HexString & {__hash: 'Hash32'}
export type TxHash = Hash32 & {__type: 'TxHash'} // hex encoded

// ⚠️ not a Bech32 address, but a simply hex-encoded address
export type Address = HexString & {__type: 'Address'}
export type AddressKeyHash = Hash28 & {__type: 'AddrKeyHash'}

export type PolicyId = HexString & {__type: 'PolicyId'}
export type AssetName = HexString & {__type: 'AssetName'}

export type Asset = {
  policyId: PolicyId
  assetName: AssetName
}

export type Token = Asset & {
  quantity: BigNumber
}

// ⚠️ ADA is represented similar to plutus as empty policy id and asset name
export const AdaPolicyId = '' as PolicyId
export const AdaAssetName = '' as AssetName

export type Value = Map<PolicyId, Map<AssetName, UInt>>
export type MintValue = Map<PolicyId, Map<AssetName, Int32>>

export type TxInput = {
  txHash: TxHash
  index: UInt
}

export type TxOutput = {
  address: Address
  value: Value
  datumHash?: Hash32
}

export type TxUnspentOutput = {
  txInput: TxInput // when used as input
  txOutput: TxOutput
}

export type Certificate = TODO

// reward address
export type Withdrawals = Map<Address, Coin>

export type ProtocolParamUpdate = TODO
export type Epoch = UInt & {__type: 'Epoch'}
export type Update = [ProtocolParamUpdate, Epoch]

export type TxBody = {
  inputs: Set<TxInput>
  outputs: TxOutput[]
  fee: Coin
  ttl?: UInt
  certificates?: Certificate[]
  withdrawals?: Withdrawals
  update?: Update
  auxiliaryDataHash?: Hash32
  validityStart?: UInt
  mint?: MintValue
  scriptDataHash?: Hash32
  collateralInputs?: Set<TxInput>
  requiredSigners?: Set<AddressKeyHash>
  networkId?: NetworkId
}

export type VKeyWitness = {
  publicKey: HexString
  signature: HexString
}

export type BootstrapWitness = {
  publicKey: HexString // bytes
  signature: HexString // bytes
  chainCode: HexString // 32 bit bytes
  addressAttributes: TODO
}

export type NativeScript = TODO

export type PlutusScript = HexString & {__type: 'PlutusScript'}

/**
 *  Helper to represent raw bytes (e.g. when using addresses in plutus data)
 * to support js -> cbor, the bytes need to be differentiated
 * a simple HexString wouldn't be enough to differentiate the type for the encoder
 */
export type Bytes = {
  bytes: HexString
  __typeBytes: true
}

/**
 * Corresponds to tagged data from plutus scripts
 * @param i represents the indexed structure
 *
 * The index is directly mapped to cbor tags in the binary format
 * i <0,7) -> cbor tag <121, 128)
 * i <7,128) -> cbor tag <1280, 1400)
 */
export interface PlutusDatumConstr {
  i: number
  data: PlutusDatum[]
  __typeConstr: true
}

// ⚠️ the conversion from cbor > PlutusDatum is lossy
// plutus uses bytes even for strings
export type PlutusDatum =
  | string
  | number
  | BigNumber
  | Bytes
  | Map<PlutusDatum, PlutusDatum>
  | PlutusDatum[]
  | PlutusDatumConstr

export enum RedeemerTag {
  Spend = 0,
  Mint = 1,
  Cert = 2,
  Reward = 3,
}

export type ExUnits = {
  mem: UInt
  steps: UInt
}

export type Redeemer = {
  tag: RedeemerTag
  index: UInt
  data: PlutusDatum
  exUnits: ExUnits
}

export type TxWitnessSet = {
  vKeyWitnesses?: VKeyWitness[]
  nativeScripts?: NativeScript[]
  bootstrapWitness?: BootstrapWitness[]
  plutusScripts?: PlutusScript[]
  plutusDatums?: PlutusDatum[]
  redeemers?: Redeemer[]
}

type Metadata =
  | Map<Metadata, Metadata>
  | Metadata[]
  | number
  | string // max length 64
  | Bytes // max length 64

// TODO, for now simple metadata
export type AuxiliaryData = Map<UInt, Metadata>

export type Transaction = {
  body: TxBody
  witnessSet: TxWitnessSet
  isValid: boolean
  auxiliaryData?: AuxiliaryData
}

export type SignTxOptions = {
  /**
   * Used for multisig; defaults to false
   */
  partialSign?: boolean
  /**
   * Additional metadata to potentially show the user before signing the Tx.
   */
  summary?: SignTxSummary
}

export type UtxoFilterOptions = {
  amount?: Value
  paginate?: Paginate
  /**
   * Skip collateral utxos in the listings. Some wallets already filter these out.
   * But they could still be spent in transactions and contribute to the balance.
   */
  withoutCollateral?: boolean
  /**
   * Some wallets experimentally support hiding away some of the utxos if they are pending.
   * They still contribute to the balance, but preferable should be not used in transactions,
   * as it would lead to potentially failed transactions. By default all locked txs
   * are included.
   */
  withoutLocked?: boolean
}

/**
 * Follows the standard API from CIP-0030
 */
export interface JsAPI {
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
   * @param {UtxoFilterOptions} options
   * @returns undefined or array of utxos
   *
   * @throws APIError, PaginateError
   */
  getUtxos(options?: UtxoFilterOptions): Promise<TxUnspentOutput[] | undefined>

  /**
   * 🚧 Experimental endpoint
   *
   * Returns a list of UTxOs that can be used as collaterals. Under normal circumstances only a single utxo
   * should be returned. Most wallets handle this utxo as a specific case that does not contribute
   * to the balance and the UTxO should be returned with the {@link getUtxos},
   * unless {@link UtxoFilterOptions.withoutCollateral} is defined.
   *
   * ⚠️ This is a slight incompatibility with the experimental APIs. Revisit when collateral handling
   * is standardized.
   *
   * @returns undefined or array of collateral utxos
   *
   * @throws APIError
   */
  getCollateral(): Promise<TxUnspentOutput[] | undefined>

  /**
   * Returns the total balance available of the wallet.
   * This is the same as summing the results of `api.getUtxos()`,
   * but it is both useful to dApps and likely already maintained by the implementing
   * wallet in a more efficient manner so it has been included in the API as well.
   *
   * 🚧 Additional optional parameter was added to help the dapp
   *    filter only the assets they are interested in. Inside wallets
   *    with large amount of NFTs the actual balance result might be huge.
   *    E.g. if the user was only interested in the balance of `policyA.tokenA`
   *         they could query it as:
   *           `getBalance(new Map(["policyA", new Map(["tokenA", 1])]))` or
   *           `getBalance(objToMap( {"policyA": {"tokenA", 1}} ))`
   *         which would return a map: Map { policyA => Map { tokenA => 131455 } }
   *
   *        A second example, the user would like to get all tokens for a given policyId:
   *        `getBalance(objToMap( {"policyA": {}}))`
   *        would return: Map { policyA => Map { tokenA => 131455, tokenB => 4, tokenC => 25 } }
   *
   * @param partialValue a partial to define which balances should the return value contain
   * @returns the full balance
   *
   * @throws APIError
   */
  getBalance(partialValue?: Value): Promise<Value>

  /**
   * Returns a list of all used (included in some on-chain transaction) addresses
   * controlled by the wallet. The results can be further paginated by `paginate`
   * if the return value is not empty or it is not `undefined`.
   *
   * @param {Paginate} paginate
   * @return undefined or array of hex-encoded addresses
   *   ⚠️ these shouldn't be Bech32 encoded addresses
   *
   * @throws APIError
   */
  getUsedAddresses(paginate?: Paginate): Promise<Address[] | undefined>

  /**
   * Returns a list of unused addresses controlled by the wallet.
   *
   * @return array of hex-encoded addresses
   *   ⚠️ these shouldn't be Bech32 encoded addresses
   *
   * @throws APIError
   */
  getUnusedAddresses(): Promise<Address[]>

  /**
   * Returns an address owned by the wallet that should be used as a change address
   * to return leftover assets during transaction creation back to the connected wallet.
   * ℹ️ This can be used as a generic receive address as well.
   *
   * @returns a hex-encoded address
   *   ⚠️ this shouldn't be Bech32 encoded address
   *
   * @throws APIError
   */
  getChangeAddress(): Promise<Address>

  /**
   * Returns the reward addresses owned by the wallet.
   * This can return multiple addresses e.g. CIP-0018.
   *
   * @returns array of hex-encoded reward addresses
   *   ⚠️ these shouldn't be Bech32 encoded addresses
   *
   * @throws APIError
   */
  getRewardAddresses(): Promise<Address[]>

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
   * @param {Transaction} tx the data for reference that matches the txHash
   * @param {TxHash} txHash the transaction hash to be signed
   * @param {SignTxOptions} options
   * @returns partial transaction witness set, only the required signatures parts
   * @throws APIError, TxSignError
   */
  signTx(tx: Transaction, txHash: TxHash, options?: SignTxOptions): Promise<TxWitnessSet>

  /**
   * This endpoint utilizes the [CIP-0008 signing spec](https://github.com/cardano-foundation/CIPs/blob/master/CIP-0008/README.md)
   * for standardization/safety reasons. It allows the dApp to request
   * the user to sign data conforming to said spec. The user's consent should be requested
   * and the details of `sig_structure` shown to them in an informative way.
   * Please refer to the CIP-0008 spec for details on how to construct the sig structure.
   *
   * @param addr hex-encoded address ⚠️ not a Bech32 encoded address
   * @param sigStructure the signing structure from CIP-0008 encoded with cbor
   *    Intentionally leaving the cbor encoding here in place.
   * @return hex-encoded bytes
   *
   * @throws APIError, DataSignError
   */
  signData(addr: Address, sigStructure: HexString): Promise<HexString>

  /**
   * As wallets should already have this ability, we allow dApps to request that a transaction
   * be sent through it. If the wallet accepts the transaction and tries to send it, it shall
   * return the transaction id for the dApp to track. The wallet is free to return the `TxSendError`
   * with code `Refused` if they do not wish to send it, or `Failure` if there was an error
   * in sending it (e.g. preliminary checks failed on signatures).
   *
   * @param tx signed transaction
   * @returns hex-encoded 32-bit length hash of the transactions
   *
   * @throws APIError, TxSendError
   */
  submitTx(tx: Transaction): Promise<TxHash>

  /**
   * Same as {@link submitTx} with the already cborized transaction
   *
   * @param tx hex-encoded cbor transaction
   * @param txHash transaction hash
   * @returns the transaction hash if successfully submitted
   *
   * @throws APIError, TxSendError
   */
  submitRawTx(tx: HexString, txHash: TxHash): Promise<TxHash>
}
