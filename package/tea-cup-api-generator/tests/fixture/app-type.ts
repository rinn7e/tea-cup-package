import type * as EqClass from 'fp-ts/Eq'
import type * as OrdClass from 'fp-ts/Ord'
import * as S from 'fp-ts/string'
import * as t from 'io-ts'

// A type of the app the features fixture uses for `format: date-time`

export type DateTime = string & { readonly __dateTime: unique symbol }

export const DateTimeJson = new t.Type<DateTime, string, unknown>(
  'DateTime',
  (u): u is DateTime => typeof u === 'string' && !Number.isNaN(Date.parse(u)),
  (u, c) =>
    typeof u === 'string' && !Number.isNaN(Date.parse(u))
      ? t.success(u as DateTime)
      : t.failure(u, c),
  (a) => a,
)

export const DateTimeEq: EqClass.Eq<DateTime> = S.Eq

export const DateTimeOrd: OrdClass.Ord<DateTime> = S.Ord
