type TrapArgs<A extends unknown[], R> = [
  args: A,
  invoke: (...args: A) => R,
  meta: {methodName: string | symbol}
]

type TrapDict<T> = {
  [K in keyof T]?: T[K] extends (...args: infer U) => infer V ? (...args: TrapArgs<U, V>) => V : never
}

export function trapMethods<T extends object>(obj: T, traps: TrapDict<T>) {
  return new Proxy<object>(obj, {
    get(target: any, prop, receiver) {
      const value: unknown = target[prop]

      if (typeof value === 'function') {
        const trap = traps[prop as keyof typeof traps]

        if (trap) {
          return function (this: any, ...args: any[]) {
            const method = value.bind(this === receiver ? target : this)
            return trap(args, method, {methodName: prop})
          }
        }
      }

      return value
    },
  }) as T
}

export type SyncTrap = <TArgs extends unknown[], TReturn>(...args: TrapArgs<TArgs, TReturn>) => TReturn

export type AsyncTrap = <TArgs extends unknown[], TReturn>(
  ...args: TrapArgs<TArgs, Promise<TReturn>>
) => Promise<TReturn>
