import {ILogger} from '@/types/base'

let _logger: ILogger = {
  error: (_) => undefined,
  info: (_) => undefined,
  log: (_) => undefined,
  warn: (_) => undefined,
  debug: (_) => undefined,
}

export const getLogger = (): ILogger => _logger

export const setLogger = (logger: ILogger) => {
  _logger = logger
}
