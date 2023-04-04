import {CborAPI, JsAPI, Wallet as WalletApi} from '@/dappConnector'
import {CborToJsApiBridge} from './CborToJsApiBridge'
import {EternlToJsApiBridge} from './EternlToJsApiBridge'
import {NamiToJsApiBridge} from './NamiToJsApiBridge'

/**
 * A thin wrapper around a standardized {@link WalletApi} that adds the method {@link enableJs}
 * which returns a compatibility layer between the wallet's {@link CborAPI} and our {@link JsAPI}.
 */
export class CborToJsApiWalletConnector implements WalletApi {
  readonly experimental: {readonly feeAddress: string | undefined}
  private cachedCborApiPromise?: Promise<CborAPI>
  private readonly config:
    | {
        vendor: 'eternl'
        cache: ReturnType<typeof EternlToJsApiBridge.createCache>
        cacheTtl: number
      }
    | {
        vendor: 'nami' | null
      }

  constructor(private wallet: Omit<WalletApi, 'enableJs'>, options: CborToJsApiWalletConnectorOptions) {
    this.config =
      options.vendor === 'eternl' ? {...options, cache: EternlToJsApiBridge.createCache()} : options
    this.experimental = {
      get feeAddress() {
        return options.vendor === 'eternl' ? wallet.experimental?.feeAddress : undefined
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

  // TODO add timeouts to all of these calls
  enable(): Promise<CborAPI> {
    const cborApiPromise = this.cachedCborApiPromise ?? this.wallet.enable()
    if (this.config.vendor === 'eternl') {
      // to invalidate, instantiate a new wallet connector
      this.cachedCborApiPromise = cborApiPromise
    }
    return cborApiPromise
  }

  async enableJs(): Promise<JsAPI> {
    const cborApi = await this.enable()
    switch (this.config.vendor) {
      case 'eternl':
        return new EternlToJsApiBridge(cborApi, this.config.cache, this.config.cacheTtl)
      case 'nami':
        return new NamiToJsApiBridge(cborApi)
      default:
        return new CborToJsApiBridge(cborApi)
    }
  }

  isEnabled(): Promise<boolean> {
    return this.wallet.isEnabled()
  }

  invalidateCache(): void {
    if (this.config.vendor === 'eternl') {
      this.config.cache = EternlToJsApiBridge.createCache()
    }
  }
}

export type CborToJsApiWalletConnectorOptions =
  | {
      vendor: 'nami' | null
    }
  | {
      vendor: 'eternl'
      cacheTtl: number
    }
