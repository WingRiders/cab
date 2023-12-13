import {encode} from 'borc'

import {CborIndefiniteLengthArray} from '@/ledger/transaction/cbor/CborIndefiniteLengthArray'
import {ProtocolParameters} from '@/types/protocolParameters'
import {Language} from '@/types/transaction'

const LANGUAGE_MAPPING = {
  [Language.PLUTUSV1]: 'plutus:v1' as const,
  [Language.PLUTUSV2]: 'plutus:v2' as const,
}

// ; For PlutusV1 (language id 0), the language view is the following:
// ;   - the value of costmdls map at key 0 (in other words, the script_integrity_data)
// ;     is encoded as an indefinite length list and the result is encoded as a bytestring.
// ;     (our apologies)
// ;     For example, the script_integrity_data corresponding to the all zero costmodel for V1
// ;     would be encoded as (in hex):
// ;     58a89f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ff
// ;   - the language ID tag is also encoded twice. first as a uint then as
// ;     a bytestring. (our apologies)
// ;     Concretely, this means that the language version for V1 is encoded as
// ;     4100 in hex.
// ; For PlutusV2 (language id 1), the language view is the following:
// ;   - the value of costmdls map at key 1 is encoded as an definite length list.
// ;     For example, the script_integrity_data corresponding to the all zero costmodel for V2
// ;     would be encoded as (in hex):
// ;     98af0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// ;   - the language ID tag is encoded as expected.
// ;     Concretely, this means that the language version for V2 is encoded as
// ;     01 in hex.
export const encodeCostModels = (
  languages: Language[],
  costModels: ProtocolParameters['costModels']
) => {
  const models: [Buffer | number, Buffer | number[]][] = languages
    .filter((lang) => LANGUAGE_MAPPING[lang] in costModels)
    .map((lang) => {
      const params = Array.from(Object.entries(costModels[LANGUAGE_MAPPING[lang]]))
        .sort((a, b) => Buffer.from(a[0]).compare(Buffer.from(b[0])))
        .map((entry) => entry[1])
      return [
        lang === Language.PLUTUSV1 ? encode(lang) : lang,
        lang === Language.PLUTUSV1 ? encode(new CborIndefiniteLengthArray(params)) : params,
      ]
    })
  // if no scripts are used, we should still add an empty map
  return encode(new Map(models))
}
