// Helper to split the addresses into chunks that fit within the length limit
// Assumes separator of length 1.
export const chunkAddresses = (addresses: string[], maxLength: number): string[][] => {
  const chunks: string[][] = []
  let currentChunk: string[] = []
  let currentLength = 0

  addresses.forEach((address) => {
    const addressLength = address.length + (currentLength === 0 ? 0 : 1) // +1 for the comma separator

    if (currentLength + addressLength > maxLength) {
      if (currentLength === 0)
        throw new Error(`Single address exceeds the limit: ${addressLength} > ${maxLength}`)
      // If adding this address exceeds the limit, push the current chunk and start a new one
      chunks.push(currentChunk)
      currentChunk = []
      currentLength = 0
    }

    // Add the address to the current chunk
    currentChunk.push(address)
    currentLength += addressLength
  })

  // Push the last chunk if it's not empty
  if (currentChunk.length > 0) {
    chunks.push(currentChunk)
  }

  return chunks
}
