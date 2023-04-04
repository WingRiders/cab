export type OptionalErrorParams = {
  message?: string
  causedBy?: Error
}

export class BaseError extends Error {
  constructor(params?: OptionalErrorParams) {
    super(params?.message || 'Unknown Error')
    this.message = params?.message || ''
    this.stack = params?.causedBy && `\nError caused by:\n${params.causedBy.stack}`
  }
}
