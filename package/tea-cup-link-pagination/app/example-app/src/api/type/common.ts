import { NullableEq } from '@rinn7e/tea-cup-prelude'
import * as EqClass from 'fp-ts/lib/Eq'
import * as N from 'fp-ts/lib/number'
import * as S from 'fp-ts/lib/string'

export type HttpError<T> = {
  statusCode: number
  err: T | null
  actualErr: string
}

export const getHttpErrorEq = <T>(
  eq: EqClass.Eq<T>,
): EqClass.Eq<HttpError<T>> =>
  EqClass.struct({
    statusCode: N.Eq,
    err: NullableEq(eq),
    actualErr: S.Eq,
  })

export type HttpErrorString = HttpError<string>

export const HttpErrorStringEq: EqClass.Eq<HttpErrorString> = getHttpErrorEq(
  S.Eq,
)

export const mkHttpError = (
  statusCode: number,
  actualErr: string,
): HttpErrorString => ({
  statusCode,
  err: actualErr,
  actualErr,
})
