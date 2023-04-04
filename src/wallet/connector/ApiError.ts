import {APIError, APIErrorCode} from '@/dappConnector'

export class ApiError extends Error implements APIError {
  constructor(public code: APIErrorCode, public info: string) {
    super(info)
    this.name = 'ApiError'
  }
}
