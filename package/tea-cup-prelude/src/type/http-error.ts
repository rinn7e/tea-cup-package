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
