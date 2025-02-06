export type FailureResponse = {Left: string}
export type SuccessResponse<T> = {
  Right: T
}

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

export type TokenRegistrySubject = string & {__typeTokenRegistrySubject: any}

export type RegisteredTokenMetadata = {
  subject: TokenRegistrySubject
  description: string
  name: string
  ticker?: string
  symbol?: string
  url?: string
  logoBase64?: string
  decimals?: number
}

export type TokenMetadataMap = {[subject: TokenRegistrySubject]: RegisteredTokenMetadata}
