import {BaseError, OptionalErrorParams} from './BaseError'
import {UnexpectedErrorReason} from './unexpectedErrorReason'

export class UnexpectedError extends BaseError {
  constructor(reason: UnexpectedErrorReason, params?: OptionalErrorParams) {
    super(params)
    this.name = reason
  }
}
