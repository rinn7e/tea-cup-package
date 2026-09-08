import * as EqClass from 'fp-ts/lib/Eq'
import * as N from 'fp-ts/lib/number'
import * as S from 'fp-ts/lib/string'

import { NullableEq } from '../common'

// HttpError
// -----------------------------------------------------------------
export type HttpError<T> = {
  statusCode: number
  err: T | null
  actualErr: string
}

export const HttpErrorEq = <T>(eqT: EqClass.Eq<T>): EqClass.Eq<HttpError<T>> =>
  EqClass.struct<HttpError<T>>({
    statusCode: N.Eq,
    err: NullableEq(eqT),
    actualErr: S.Eq,
  })

export type HttpErrorString = HttpError<string>
export const HttpErrorStringEq = HttpErrorEq(S.Eq)

export const mkHttpError = (
  actualErr: string,
  statusCode = 400,
): HttpErrorString => ({
  statusCode,
  err: actualErr,
  actualErr,
})
