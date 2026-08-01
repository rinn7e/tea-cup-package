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
import * as RD from '@devexperts/remote-data-ts'
import * as A from 'fp-ts/lib/Array'
import * as E from 'fp-ts/lib/Either'
import * as EqClass from 'fp-ts/lib/Eq'
import type * as IO from 'fp-ts/lib/IO'
import * as OrdClass from 'fp-ts/lib/Ord'
import * as Set from 'fp-ts/lib/Set'
import { pipe } from 'fp-ts/lib/function'
import * as S from 'fp-ts/lib/string'
import * as t from 'io-ts'
import * as tt from 'io-ts-types'
import { PathReporter } from 'io-ts/PathReporter'

// General purpose util functions
// ---------------------------------

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

/**
 * Make a nullable type, not null. Should ony be used on a type
 * that is sure to be not null.
 */
export const unsafeFromNullable = <A, _>(a: A | null) => {
  if (a) return a
  throw new Error('unsafeFromNullable: Cannot convert null value.')
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

export const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

// Reload page
export const appRouteReload = (r: string) => {
  window.location.replace(r)
}

// Breaks a string up into a list of words, which were delimited by white space
export const words = (r: string): string[] => {
  const result = r.split(/\s+/)
  return result ? result : [r]
}

// Reverse of words.
export const unwords = (r: string[]): string => {
  const result = r.join(' ')
  return result
}

// Breaks a string up into a list of sentence
export const lines = (r: string): string[] => {
  const result = r.split(/\r?\n/)
  return result ? result : [r]
}

// Reverse of lines.
export const unlines = (r: string[]): string => {
  const result = r.join('\n')
  return result
}

// Check if an element has overflow child.
export const hasChildOverflow = (ref: { current: HTMLDivElement | null }) => {
  if (ref.current)
    return (
      ref.current.scrollHeight > ref.current.clientHeight ||
      ref.current.scrollWidth > ref.current.clientWidth
    )
  return false
}

// Capitalize first letter
export const capFirst = (string: string) => {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export const runIO = <A>(io: IO.IO<A>): A => {
  return io()
}

// https://gist.github.com/ca0v/73a31f57b397606c9813472f7493a940?permalink_comment_id=3104895#gistcomment-3104895
// Useful for onScroll listener
export const throttle = <F extends (...args: any[]) => any>(
  func: F,
  waitFor: number,
) => {
  const now = () => new Date().getTime()
  const resetStartTime = () => (startTime = now())
  let timeout: ReturnType<typeof setTimeout> | null
  let startTime: number = now() - waitFor

  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise((resolve) => {
      const timeLeft = startTime + waitFor - now()
      if (timeout) {
        clearTimeout(timeout)
      }
      if (startTime + waitFor <= now()) {
        resetStartTime()
        resolve(func(...args))
      } else {
        timeout = setTimeout(() => {
          resetStartTime()
          resolve(func(...args))
        }, timeLeft)
      }
    })
}

export const mkDate = (dateString: string): Date => new Date(dateString)

export const NullableEq = <A>(aEq: EqClass.Eq<A>): EqClass.Eq<A | null> => ({
  equals: (first, second) => {
    if (first && second) return aEq.equals(first, second)
    else if (first) return false
    else if (second) return false
    // If both are null return true
    else return true
  },
})

export const EqAlways: EqClass.Eq<any> = { equals: () => true }

// Eq instance for Unit type (null is used as unit type)
export const nullEq: EqClass.Eq<null> = EqAlways

export const UndefinableEq = <A>(
  aEq: EqClass.Eq<A>,
): EqClass.Eq<A | undefined> => ({
  equals: (first, second) => {
    if (first && second) return aEq.equals(first, second)
    else if (first) return false
    else if (second) return false
    // If both are undefined return true
    else return true
  },
})

export const filterUnique = <A>(
  equal: (a1: A, a2: A) => boolean,
  arrayToBeFiltered: A[],
  arrayToBeCheckedWith: A[],
) => {
  const result = pipe(
    arrayToBeFiltered,
    A.reduce([] as A[], (acc, filterEl) =>
      arrayToBeCheckedWith.findIndex((checkEl) => equal(checkEl, filterEl)) < 0
        ? acc.concat(filterEl)
        : acc,
    ),
  )
  return result
}

// Concat data at the end, if the data exists, we overwrite it
export const concatOverwriteDup = <A>(
  equal: (a1: A, a2: A) => boolean,
  currentData: A[],
  incomingData: A[],
): A[] => {
  const uniqueCurrentData = filterUnique(equal, currentData, incomingData)
  return uniqueCurrentData.concat(incomingData)
}

export const booleanFromString = (v: string): boolean | null => {
  if (v === 'true') return true
  if (v === 'false') return false
  console.warn('booleanFromString: invalid input', v)
  return null
}

export const booleanFromUndefinedWithDefault = (
  v: string | undefined,
  de: boolean,
): boolean => {
  if (v === 'true') return true
  if (v === 'false') return false
  return de
}

export const nonEmptyStr = (s: string): s is string => s.length > 0

// The same as haskell's error.
export const error = (err: string): any => {
  return () => {
    throw new Error(err)
  }
}

// io-ts Json instances for RemoteData
export const RemoteProgressJson = t.type({
  loaded: t.number,
  total: tt.option(t.number),
})

export const RemoteDataJson = <A>(
  aJson: t.Type<A>,
): t.Type<RD.RemoteData<string, A>> =>
  t.union([
    t.type({
      _tag: t.keyof({ RemoteInitial: null }),
    }) as t.Type<RD.RemoteInitial>,
    t.type({
      _tag: t.keyof({ RemotePending: null }),
      progress: tt.option(RemoteProgressJson),
    }) as t.Type<RD.RemotePending>,
    t.type({
      _tag: t.keyof({ RemoteFailure: null }),
      error: t.string,
    }) as t.Type<RD.RemoteFailure<string>>,
    t.type({ _tag: t.keyof({ RemoteSuccess: null }), value: aJson }) as t.Type<
      RD.RemoteSuccess<A>
    >,
  ])

export const rdConvertNullSuccessToInitial = <E, A>(
  input: RD.RemoteData<E, A | null>,
): RD.RemoteData<E, A> => {
  if (input._tag === 'RemoteSuccess') {
    if (input.value) return RD.success(input.value)
    else return RD.initial
  } else return input
}

// Function to find elements in listA but not in listB
// Note: should be used with list of ids
export const diffIdList =
  <A>(eq: EqClass.Eq<A>) =>
  (idListB: A[]) =>
  (idListA: A[]): A[] => {
    return pipe(
      idListA,
      A.filter((a) => !A.elem(eq)(a)(idListB)),
    )
  }

export const jsonParse = (input: any): E.Either<string, any> => {
  try {
    const result = JSON.parse(input)
    return E.right(result)
  } catch (err) {
    return E.left('jsonParse error: ' + (err as Error).toString())
  }
}

// Same as jsonDecoder.decode, but Either left has a proper report.
export const decodeWithReport = <A>(
  jsonDecoder: t.Type<A, unknown>,
  input: any,
): E.Either<string, A> => {
  const decoded = jsonDecoder.decode(input)
  if (decoded._tag === 'Right') return E.right(decoded.right)
  else
    return E.left(
      'decodeWithReport error: ' +
        A.intercalate(S.Monoid)('\n')(PathReporter.report(decoded)),
    )
}

// Converts any error value into a readable string.
// Handles Error objects, plain strings, objects, and other types.
// Falls back to String() if nothing else works.
export const errorToString = (err: unknown): string => {
  if (err instanceof Error) {
    return err.stack || err.message
  }
  if (typeof err === 'string') {
    return err
  }
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

// Sort with ord then remove dup via converting to Set
export const sortAndRemoveDup =
  <A>(eq: EqClass.Eq<A>, ord: OrdClass.Ord<A>) =>
  (arr: A[]): A[] => {
    return pipe(
      arr,
      A.sort(ord), // have to sort first such that, remove dup would remove the oldest
      Set.fromArray(eq), // remove duplication
      Set.toArray(ord), // convert back to array
    )
  }

// Concat if not already exist
export const concatIfNotExist =
  <A>(E: EqClass.Eq<A>) =>
  (value: A) =>
  (array: A[]): A[] =>
    A.elem(E)(value)(array) ? array : A.concat([value])(array)

export const getFirstLine = (text: string) => {
  return text.split(/\r?\n/, 1)[0]
}

// Given an html, remove its node until it is not over the limit
// TODO: Write test for this
export const truncateHtml = (input: string, limit: number): string => {
  if (input.length <= limit) return input

  const div = document.createElement('div')
  div.innerHTML = input

  let count = 0
  let passedLimit = false

  const traverse = (node: Node) => {
    if (passedLimit) {
      if (node.parentNode) {
        node.parentNode.removeChild(node)
      }
      return
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || ''
      if (count + text.length > limit) {
        node.textContent = text.slice(0, limit - count) + '...'
        count = limit
        passedLimit = true
      } else {
        count += text.length
      }
    } else {
      const children = Array.from(node.childNodes)
      for (const child of children) {
        if (passedLimit) {
          if (child.parentNode) {
            child.parentNode.removeChild(child)
          }
        } else {
          traverse(child)
        }
      }
    }
  }

  const children = Array.from(div.childNodes)
  for (const child of children) {
    if (passedLimit) {
      if (child.parentNode) {
        child.parentNode.removeChild(child)
      }
    } else {
      traverse(child)
    }
  }

  return div.innerHTML
}

// Given a text, slice it until it is not over the limit
export const truncateText = (input: string, limit: number): string => {
  if (input.length <= limit) return input
  return input.slice(0, limit) + '...'
}

export const brandedString = <T extends string>(
  name: string,
): t.Type<T, T, unknown> =>
  new t.Type<T, T, unknown>(
    name,
    (u): u is T => typeof u === 'string',
    (u, c) => (typeof u === 'string' ? t.success(u as T) : t.failure(u, c)),
    t.identity,
  )

export const brandedNumber = <T extends number>(
  name: string,
): t.Type<T, T, unknown> =>
  new t.Type<T, T, unknown>(
    name,
    (u): u is T => typeof u === 'number',
    (u, c) => (typeof u === 'number' ? t.success(u as T) : t.failure(u, c)),
    t.identity,
  )
