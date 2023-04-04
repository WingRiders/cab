export const ipv4AddressToBuf = (ipv4Address: string) => {
  const splitAddressNumbers = ipv4Address.split('.').map((x) => +x)
  return Buffer.from(splitAddressNumbers)
}

export const ipv6AddressToBuf = (ipv6Address: string) => {
  const ipv6NoSemicolons = ipv6Address.replace(/:/g, '')
  const ipv6Buf = Buffer.from(ipv6NoSemicolons, 'hex')
  const copy = Buffer.from(ipv6Buf)
  const endianSwappedBuf = copy.swap32()
  return endianSwappedBuf
}
