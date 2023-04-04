import {encode} from 'borc'

export class CborIndefiniteLengthArray {
  elements: Array<any>

  constructor(elements: any) {
    this.elements = elements
  }

  encodeCBOR(encoder: any) {
    return encoder.push(
      Buffer.concat([
        Buffer.from([0x9f]), // indefinite array prefix
        ...this.elements.map((e) => encode(e)),
        Buffer.from([0xff]), // end of array
      ])
    )
  }
}
