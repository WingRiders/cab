export function range(start = 0, stop) {
  return Array.from({length: stop - start}, (x, i) => start + i)
}
