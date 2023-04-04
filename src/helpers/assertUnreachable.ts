// Required for typescript case exhaustiveness. Remove after strictNullChecks are turned on
export function assertUnreachable(x: never): never {
  throw new Error('This should be unreachable.')
}
