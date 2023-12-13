import {CborAPI} from './cborApi'
import {JsAPI} from './jsApi'

export type WalletOptions = {
  /** @deprecated */
  appId: string // TODO: remove, it's not in the CIP
}

export interface StandardWallet {
  /**
   * The API is split into two stages to maintain the user's privacy,
   * as the user will have to consent to `wallet.enable()` in order for the dApp to read
   * any information pertaining to the user's wallet
   *
   * The wallet should request the user's permission to connect the web page to the user's wallet,
   * and if permission has been granted, the full API will be returned to the dApp to use.
   * The wallet can choose to maintain a whitelist to not necessarily ask the user's
   * permission every time access is requested, but this behavior is up to the wallet
   * and should be transparent to web pages using this API. If a wallet is already
   * connected this function should not request access a second time, and instead
   * just return the `API` object.
   *
   * @throws APIError
   */
  enable(options?: WalletOptions): Promise<CborAPI>

  /**
   * Returns true if the dApp is already connected to the user's wallet,
   * or if requesting access would return true without user confirmation
   * (e.g. the dApp is whitelisted), and false otherwise. If this function returns true,
   * then any subsequent calls to `wallet.enable()` during the current session
   * should succeed and return the `API` object.
   *
   * @throws APIError
   */
  isEnabled(): Promise<boolean>

  /**
   * The version number of the API that the wallet supports.
   */
  apiVersion: string

  /**
   * A name for the wallet which can be used inside of the dApp for the purpose of asking
   * the user which wallet they would like to connect with.
   */
  name: string

  /**
   * A URI image (e.g. data URI base64 or other) for img src for the wallet which can be used
   * inside of the dApp for the purpose of asking the user which wallet
   * they would like to connect with.
   */
  icon: string

  /**
   * New or non-standard features may be present under this namespace.
   */
  experimental?: {
    /**
     * A bech32-encoded string used by Eternl for the DApp Store comfort fee.
     */
    feeAddress?: string
  }
}

export interface Wallet extends StandardWallet {
  /**
   *  Analogous to {@link enable()} but returning a JS-based API instead of the standard CBOR one.
   */
  enableJs(options?: WalletOptions): Promise<JsAPI>

  invalidateCache?(): void
}
