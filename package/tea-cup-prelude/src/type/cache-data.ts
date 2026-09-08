// SPDX-FileCopyrightText: 2024 Rinn7e <https://rinn7e.io>
//
// SPDX-License-Identifier: MIT
import * as RD from '@devexperts/remote-data-ts'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'

// Cache data type, this is meant to be used as 'import * as CacheData'.
export type Type<A> = {
  data: RD.RemoteData<string, A>
  updatedAt: Date
}

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
