import {CabInternalError, CabInternalErrorReason} from '@/errors'

import {assetId, cacheResults, request} from '../helpers'
import {
  Asset,
  FailureResponse,
  RegisteredTokenMetadata,
  SuccessResponse,
  TokenRegistrySubject,
} from '../types'

const MAX_SUBJECTS_COUNT = 2000

export type TokenMetadataField<ValueType> = {
  sequenceNumber: number
  value: ValueType
  signatures: Array<{
    signature: string
    publicKey: string
  }>
}

export type TokenMetadata = {
  subject: string
  name: TokenMetadataField<string>
  description: TokenMetadataField<string>
  policy?: string
  ticker?: TokenMetadataField<string>
  url?: TokenMetadataField<string>
  logo?: TokenMetadataField<string>
  decimals?: TokenMetadataField<number>
}
export type TokenMetadataResponse = SuccessResponse<TokenMetadata[]> | FailureResponse

export const createTokenRegistrySubject = (policyId: string, assetName: string): TokenRegistrySubject =>
  assetId({assetName, policyId}) as TokenRegistrySubject //

export class TokenRegistry {
  private readonly url: string
  private readonly fetchTokensMetadata: (subjects: string[]) => Promise<TokenMetadataResponse>

  constructor(url: string, enableCaching: boolean = true) {
    this.url = url
    this.fetchTokensMetadata = enableCaching
      ? // 1 hour, not really needed to refresh the cache during a single app session
        cacheResults(60 * 60 * 1000)(this._fetchTokensMetadata)
      : this._fetchTokensMetadata
  }

  private readonly _fetchTokensMetadata = async (subjects: string[]): Promise<TokenMetadataResponse> => {
    if (subjects.length > MAX_SUBJECTS_COUNT) {
      return Promise.resolve({Left: 'Request over max limit'})
    }
    if (subjects.length === 0) {
      return Promise.resolve({Right: []})
    }
    const requestBody = {subjects}
    try {
      return await request(this.url, 'POST', JSON.stringify(requestBody), {
        'Content-Type': 'application/json',
      })
    } catch (e) {
      return Promise.resolve({Left: 'An unexpected error has occurred'})
    }
  }

  public static parseTokensMetadata = (
    toParse: TokenMetadataResponse
  ): Map<TokenRegistrySubject, RegisteredTokenMetadata> => {
    const isSuccessResponse = (
      response: TokenMetadataResponse
    ): response is SuccessResponse<TokenMetadata[]> =>
      (response as SuccessResponse<TokenMetadata[]>).Right !== undefined

    const map = new Map()
    if (isSuccessResponse(toParse)) {
      toParse.Right.forEach((tokenMetadata) =>
        map.set(tokenMetadata.subject, {
          subject: tokenMetadata.subject,
          description: tokenMetadata.description.value,
          name: tokenMetadata.name.value,
          ticker: tokenMetadata?.ticker?.value,
          url: tokenMetadata?.url?.value,
          logoBase64: tokenMetadata?.logo?.value,
          decimals: tokenMetadata?.decimals?.value,
        })
      )
    } else {
      throw new CabInternalError(CabInternalErrorReason.Error, {message: toParse.Left})
    }

    return map
  }

  public readonly getTokensMetadata = async (
    assets: Asset[]
  ): Promise<Map<TokenRegistrySubject, RegisteredTokenMetadata>> => {
    const subjects = [
      ...new Set(assets.map(({policyId, assetName}) => createTokenRegistrySubject(policyId, assetName))),
    ]
    const tokensMetadata = await this.fetchTokensMetadata(subjects)
    return TokenRegistry.parseTokensMetadata(tokensMetadata)
  }
}
