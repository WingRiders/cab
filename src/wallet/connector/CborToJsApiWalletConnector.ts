import type {
  CborAPI,
  JsAPI,
  StandardWallet as StandardWalletApi,
  Wallet as WalletApi,
} from '@/dappConnector'

import {CborToJsApiBridge} from './CborToJsApiBridge'
import {EternlToJsApiBridge} from './EternlToJsApiBridge'
import {addTimeouts, PreTimeout} from './timeout'
import {TyphonToJsApiBridge} from './TyphonToJsApiBridge'
import {YoroiToJsApiBridge} from './YoroiToJsApiBridge'

export enum WalletApiVendor {
  TYPHON = 'typhon',
  YOROI = 'yoroi',
  ETERNL = 'eternl',
  WALLET_CONNECT = 'wc',
  NUFI_SSO = 'nufiSSO',
  NUFI_META_MASK_SNAP = 'nufiMetaMaskSnap',
}
/**
 * A thin wrapper around a standardized {@link WalletApi} that adds the method {@link enableJs}
 * which returns a compatibility layer between the wallet's {@link CborAPI} and our {@link JsAPI}.
 */
export class CborToJsApiWalletConnector implements WalletApi {
  readonly experimental: {readonly feeAddress: string | undefined}
  private cachedCborApiPromise?: Promise<CborAPI>
  private readonly config:
    | {
        vendor: WalletApiVendor.ETERNL
        cache: ReturnType<typeof EternlToJsApiBridge.createCache>
        cacheTtl: number
      }
    | {
        vendor:
          | WalletApiVendor.TYPHON
          | WalletApiVendor.YOROI
          | WalletApiVendor.NUFI_SSO
          | WalletApiVendor.NUFI_META_MASK_SNAP
          | null
      }
    | {
        vendor: WalletApiVendor.WALLET_CONNECT
        apiTimeoutMs: number
        apiPreTimeout?: PreTimeout
      }

  constructor(private wallet: StandardWalletApi, options: CborToJsApiWalletConnectorOptions) {
    this.config =
      options.vendor === WalletApiVendor.ETERNL
        ? {...options, cache: EternlToJsApiBridge.createCache()}
        : options

    this.experimental = {
      get feeAddress() {
        return options.vendor === WalletApiVendor.ETERNL ? wallet.experimental?.feeAddress : undefined
      },
    }
  }

  get icon(): string {
    return this.wallet.icon
  }

  get name(): string {
    return this.wallet.name
  }

  get apiVersion(): string {
    return this.wallet.apiVersion
  }

  get vendor(): WalletApiVendor | null {
    return this.config.vendor
  }

  // TODO add timeouts to all of these calls
  enable(): Promise<CborAPI> {
    const cborApiPromise = this.cachedCborApiPromise ?? this.wallet.enable()
    if (
      this.config.vendor === WalletApiVendor.ETERNL ||
      this.config.vendor === WalletApiVendor.WALLET_CONNECT
    ) {
      this.cachedCborApiPromise = cborApiPromise
    }
    return cborApiPromise
  }

  async enableJs(): Promise<JsAPI> {
    const cborApi = await this.enable()
    switch (this.config.vendor) {
      case WalletApiVendor.ETERNL:
        return new EternlToJsApiBridge(cborApi, this.config.cache, this.config.cacheTtl)
      case WalletApiVendor.WALLET_CONNECT:
        return addTimeouts(new CborToJsApiBridge(cborApi), {
          timeoutMs: this.config.apiTimeoutMs,
          preTimeouts: this.config.apiPreTimeout && [this.config.apiPreTimeout],
        })
      case WalletApiVendor.TYPHON:
        return new TyphonToJsApiBridge(cborApi)
      case WalletApiVendor.YOROI:
        return new YoroiToJsApiBridge(cborApi)
      default:
        return new CborToJsApiBridge(cborApi)
    }
  }

  isEnabled(): Promise<boolean> {
    return this.wallet.isEnabled()
  }

  invalidateCache(): void {
    this.cachedCborApiPromise = undefined

    if (this.config.vendor === WalletApiVendor.ETERNL) {
      this.config.cache = EternlToJsApiBridge.createCache()
    }
  }
}

export type CborToJsApiWalletConnectorOptions =
  | {
      vendor:
        | WalletApiVendor.TYPHON
        | WalletApiVendor.YOROI
        | WalletApiVendor.NUFI_SSO
        | WalletApiVendor.NUFI_META_MASK_SNAP
        | null
    }
  | {
      vendor: WalletApiVendor.ETERNL
      cacheTtl: number
    }
  | {
      vendor: WalletApiVendor.WALLET_CONNECT
      apiTimeoutMs: number
      apiPreTimeout?: PreTimeout
    }
