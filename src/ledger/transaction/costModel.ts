import {encode} from 'borc'
import {Language} from '@/types/transaction'
import {ProtocolParameters} from '@/types/protocolParameters'
import CborizedCostModel from './cbor/CborizedCostModel'

const LANGUAGE_MAPPING = {
  [Language.PLUTUSV1]: 'plutus:v1' as 'plutus:v1',
}

export const encodeCostModels = (
  languages: Language[],
  costModels: ProtocolParameters['costModels']
) => {
  const models: [Buffer, Buffer][] = languages
    .filter((lang) => LANGUAGE_MAPPING[lang] in costModels)
    .map((lang) => {
      // TODO load cost models from the config
      const costModel = new CborizedCostModel(
        new Map(Object.entries(costModels[LANGUAGE_MAPPING[lang]]))
      )

      const tag = encode(lang)
      const params = encode(costModel) // todo replace with cost models

      return [tag, params]
    })
  // if no scripts are used, we should still add an empty map
  return encode(new Map(models))
}
