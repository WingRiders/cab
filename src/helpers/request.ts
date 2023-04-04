import 'isomorphic-fetch'
import {DELAY_AFTER_TOO_MANY_REQUESTS} from '@/constants'
import {CabInternalError, CabInternalErrorReason} from '@/errors'
import {throwIfEpochBoundary} from './epochBoundaryUtils'
import {sleep} from './sleep'
import {omit} from 'lodash'

// remove authorization and credential headers
const sanitizeLogs = (params?: RequestInit) => omit(params, ['credentials', 'headers'])

export async function request(
  url: string,
  method: string = 'GET',
  body: BodyInit | null = null,
  headers: HeadersInit = {}
) {
  let requestParams = {
    method,
    headers,
    credentials: 'include' as RequestCredentials,
    // mode: 'no-cors',
  }
  if (method.toUpperCase() !== 'GET') {
    requestParams = Object.assign({}, requestParams, {body})
  }
  const response = await fetch(url, requestParams).catch((e) => {
    throw new CabInternalError(CabInternalErrorReason.NetworkError, {
      message: `${method} ${url} has failed with the following error: ${e}`,
    })
  })
  if (!response) {
    throw new CabInternalError(CabInternalErrorReason.NetworkError, {
      message: `No response from ${method} ${url}`,
    })
  }

  if (response.status === 429) {
    await sleep(DELAY_AFTER_TOO_MANY_REQUESTS)
    return request(url, method, body, headers)
  } else if (response.status >= 500) {
    const errorParams = {
      message: `${method} ${url} returns error: ${response.status} on payload: ${JSON.stringify(
        sanitizeLogs(requestParams)
      )} Result: ${await response.text()}`,
    }
    throwIfEpochBoundary(errorParams)
    throw new CabInternalError(CabInternalErrorReason.ServerError, errorParams)
  } else if (response.status >= 400) {
    throw new CabInternalError(CabInternalErrorReason.NetworkError, {
      message: `${method} ${url} returns error: ${response.status} on payload: ${JSON.stringify(
        sanitizeLogs(requestParams)
      )} Result: ${await response.text()}`,
    })
  }
  return response.json()
}
