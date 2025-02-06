import {encode} from 'borc'

export class CborDefiniteLengthArray {
  elements: Array<any>

  constructor(elements: any) {
    this.elements = elements
  }

  encodeCBOR(encoder: any) {
    return encoder.push(
      Buffer.concat([Buffer.from([0x80 + this.elements.length]), ...this.elements.map((e) => encode(e))])
    )
  }
}
