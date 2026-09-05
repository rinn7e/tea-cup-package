import * as RD from '@devexperts/remote-data-ts'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'

export type Type<A> = {
  data: RD.RemoteData<string, A>
  updatedAt: Date
}

export const fromRD = <A>(data: RD.RemoteData<string, A>): Type<A> => ({
  data,
  updatedAt: new Date(),
})

export const fromNullable = <A>(data: A | null): Type<A> =>
  data !== null ? fromRD(RD.success(data)) : fromRD(RD.initial)

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
  (fa: Type<A>): Type<B> => ({
    ...fa,
    data: pipe(fa.data, RD.map(f)),
  })

export const isValidPendingCache = <A>(cache: Type<A>): boolean => {
  if (cache.data._tag === 'RemotePending') {
    const currentDate = new Date()
    const diffSec = (currentDate.getTime() - cache.updatedAt.getTime()) / 1000
    if (diffSec > 1) {
      return false
    }
    return true
  }
  return true
}
