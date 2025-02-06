import 'isomorphic-fetch'

import fetchMock from 'fetch-mock'

import {mockConfig} from './mock-config'
import singleAddressesMock from './singleAddressesMock'
import utxoMock from './utxoMock'

const mock = () => {
  function clean() {
    fetchMock.restore()
  }

  function mockFilterUsedAddressesEndpoint() {
    fetchMock.config.overwriteRoutes = true

    fetchMock.post({
      name: `${mockConfig.CAB_BACKEND_URL}/filterUsedAddresses`,
      matcher: `${mockConfig.CAB_BACKEND_URL}/filterUsedAddresses`,
      response: (url, options) => {
        const results: string[] = []
        const body = JSON.parse(options.body)
        body.addresses.forEach((address: string) => {
          const singleResponse = singleAddressesMock[address]
          if (singleResponse && singleResponse.Right.caTxNum > 0) {
            results.push(address)
          }
        })

        return {
          status: 200,
          body: results,
          sendAsJson: true,
        }
      },
    })
  }

  function mockUtxoEndpoint() {
    fetchMock.config.overwriteRoutes = true

    const urlBeginsWith = `${mockConfig.CAB_BACKEND_URL}/utxos?addresses=`

    fetchMock.get({
      name: `${mockConfig.CAB_BACKEND_URL}/utxos`,
      matcher: `begin:${urlBeginsWith}`,
      response: (url, options) => {
        const addresses = url.substring(urlBeginsWith.length).split(',')
        let utxos = []
        addresses.forEach((addr) => {
          if (utxoMock[addr]) utxos = utxos.concat(utxoMock[addr])
        })
        return {
          status: 200,
          body: utxos,
          sendAsJson: true,
        }
      },
    })
  }

  return {
    mockFilterUsedAddressesEndpoint,
    mockUtxoEndpoint,
    clean,
  }
}

export default mock
