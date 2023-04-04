import {BaseError, OptionalErrorParams} from './BaseError'
import {CabInternalErrorReason} from './cabInternalErrorReason'

export class CabInternalError extends BaseError {
  constructor(reason: CabInternalErrorReason, params?: OptionalErrorParams) {
    super(params || {message: reason})
    this.name = reason
  }
}
