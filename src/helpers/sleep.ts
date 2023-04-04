export function sleep<T>(ms, value?: T): Promise<T | undefined> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}
