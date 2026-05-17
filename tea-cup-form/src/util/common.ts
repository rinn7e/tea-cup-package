/* MIT License

Copyright (c) 2025 Moremi Vannak

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. */
import * as A from 'fp-ts/lib/Array'
import * as EqClass from 'fp-ts/lib/Eq'
import { type Eq } from 'fp-ts/lib/Eq'
import * as M from 'fp-ts/lib/Map'
import { pipe } from 'fp-ts/lib/function'

// Similar to haskell's `and`
export const and: (as: Array<boolean>) => boolean = A.matchLeft(
  () => true,
  (x, xs) => x && and(xs),
)

// Similar to haskell's `or`
export const or: (as: Array<boolean>) => boolean = A.matchLeft(
  () => false,
  (x, xs) => x || or(xs),
)

export const NullableEq = <A>(aEq: EqClass.Eq<A>): EqClass.Eq<A | null> => ({
  equals: (first, second) => {
    if (first && second) return aEq.equals(first, second)
    else if (first) return false
    else if (second) return false
    // If both are null return true
    else return true
  },
})

// Similar to `modifyAt` but leave the current map the way it is if the index is not found.
export const modifyAtIfExist = <K>(
  E: Eq<K>,
): (<A>(k: K, f: (a: A) => A) => (m: Map<K, A>) => Map<K, A>) => {
  return (k, f) => (m) => {
    const result = pipe(m, M.modifyAt(E)(k, f))
    switch (result._tag) {
      case 'Some':
        return result.value
      case 'None':
        return m
    }
  }
}

// Create valid html id from a normal string
// Replace space with `_`
// Only used the first 6 words
export const mkIdFromString = (text: string): string => {
  const amountOfWords = 6
  return text.split(' ').splice(0, amountOfWords).join('_')
}

/**
 * Run a function that accepts no argument, useful when running if/else/switch function
 * `exec(() => 1 + 1)` is the same as `(() => 1 + 1)()`
 * Resemble fp-ts `Lazy.execute`.
 */
export const exec = <A>(f: () => A): A => f()

/**
 * If the value has more than 2 decimal, rounded it to 2
 * If the value has less than 2 decimal, display .00 or .x0
 */
export const limitDecimal2Digit = (value: number) => {
  const result = (Math.round(value * 100) / 100).toFixed(2)
  return result
}

// Given an object convert it to string, so it can be used as `useEffect` dependency
// Note that
// - `useEffect` only does shallow obj comparison that's why we need this.
// - Shouldn't be used it with deep nested object.
// - Shouldn't be used with 'props.<field>' where the <field> is used to initialize `State`.
// - Shouldn't be used with `Map` (convert to array using M.toArray first)
// - When used with `msgFromParent`, be sure to reset it to 'None' after handling it, otherwise
// the same msgFromParent won't re-trigger the effect.
// - Consider upgrading to this https://github.com/shuding/stable-hash,
// if the current implementation is not good enough
export const mkObjComparable = (obj: object | null): string => {
  return JSON.stringify(obj)
}
