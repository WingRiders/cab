import {CborIndefiniteLengthArray} from './CborIndefiniteLengthArray'

/**
 * Encodes CostModel
 *
 */
export default class CborizedCostModel {
  data: Map<string, number>

  constructor(data: Map<string, number>) {
    this.data = data
  }

  encodeCBOR(encoder: any) {
    // uses the same canonical order as Data.Map in haskell -> see costModel canonical serialization
    const params = Array.from(this.data.entries())
      .sort((a, b) => Buffer.from(a[0]).compare(Buffer.from(b[0])))
      .map((entry) => entry[1])
    return encoder.pushAny(new CborIndefiniteLengthArray(params))
  }
}
