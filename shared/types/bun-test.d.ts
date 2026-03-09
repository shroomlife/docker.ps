declare module 'bun:test' {
  export function describe(name: string, fn: () => void): void
  export function expect<T>(value: T): {
    toBe(expected: unknown): void
    not: {
      toBe(expected: unknown): void
      toBeNull(): void
    }
    toBeNull(): void
    toHaveLength(expected: number): void
    toEqual(expected: unknown): void
  }
  export function test(name: string, fn: () => void | Promise<void>): void
}
