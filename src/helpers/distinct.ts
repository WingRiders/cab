export function distinct<T>(array: T[]) {
  return Array.from(new Set(array)) as T[]
}
