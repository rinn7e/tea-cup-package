/* MIT License

Copyright (c) 2026 Moremi Vannak

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
import { type Eq } from 'fp-ts/lib/Eq'
import * as M from 'fp-ts/lib/Map'
import { pipe } from 'fp-ts/lib/function'

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

export const lookupWithDefault = <K>(
  E: Eq<K>,
): (<A>(k: K) => (a: A) => (m: Map<K, A>) => A) => {
  return (k) => (a) => (m) => {
    const result = pipe(m, M.lookup(E)(k))
    switch (result._tag) {
      case 'Some':
        return result.value
      default:
        return a
    }
  }
}
