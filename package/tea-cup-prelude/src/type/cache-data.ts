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
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import * as t from 'io-ts'
import * as tt from 'io-ts-types'

import { RemoteDataJson } from '../common'

// Cache data type, this is meant to be used as 'import * as CacheData'.
export type Type<A> = {
  data: RD.RemoteData<string, A>
  // ^ TODO: instead of using RemoteData, we might consider using our own sum-type for the state
  // which are: "NoCache", "PendingCache", "HaveCache"

  // Side note: We might consider not storing "pending" all together, and use react state
  // to track the pending status instead (Either in `App` or `Api` component).
  // With this, we only store the cache when the status succeed.
  // Any component needed to track the pending status, will need to access the state in that component
  // instead.

  updatedAt: Date
}

export const Json = <A>(aJson: t.Type<A>): t.Type<Type<A>, unknown> =>
  t.type({
    data: RemoteDataJson(aJson),
    updatedAt: tt.date,
  })

// Create cache data from RemoteData, using 'now' as updatedAt.
export const fromRD = <A>(data: RD.RemoteData<string, A>): Type<A> => ({
  data,
  updatedAt: new Date(),
})

export const fromNullable = <A>(data: A | null): Type<A> =>
  data ? fromRD(RD.success(data)) : fromRD(RD.initial)

export const fromO = <A>(data: O.Option<A>): Type<A> =>
  pipe(
    data,
    O.fold(
      () => fromRD(RD.initial),
      (a) => fromRD(RD.success(a)),
    ),
  )

export const map =
  <A, B>(f: (i: A) => B) =>
  (fa: Type<A>): Type<B> => {
    return {
      ...fa,
      data: pipe(fa.data, RD.map(f)),
    }
  }

// When cache is in a pending state more than 1 second, we treat it as invalid
export const isValidPendingCache = <A>(cache: Type<A>): boolean => {
  if (cache.data._tag === 'RemotePending') {
    const currentDate = new Date()
    const diffSec = (currentDate.getTime() - cache.updatedAt.getTime()) / 1000

    if (diffSec > 1) {
      console.warn(
        'Some cache is in pending state more than 1 seconds, ignoring the cache',
      )
      return false
    } else return true
  } else return true
}
