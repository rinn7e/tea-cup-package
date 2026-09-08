import * as E from 'fp-ts/lib/Either'
import * as TE from 'fp-ts/lib/TaskEither'

import { type HttpError, mkHttpError } from '../type/common'

export const fetchJson = <T>(
  url: string,
  options?: RequestInit,
): TE.TaskEither<HttpError<string>, T> => {
  return async () => {
    try {
      const res = await fetch(url, options)
      if (!res.ok) {
        const text = await res.text()
        return E.left(mkHttpError(res.status, text || res.statusText))
      }
      if (res.status === 204) {
        return E.right(JSON.parse('null'))
      }
      const text = await res.text()
      if (!text || text.trim() === '') {
        return E.right(JSON.parse('null'))
      }
      return E.right(JSON.parse(text))
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      return E.left(mkHttpError(500, errMsg || 'Network error'))
    }
  }
}
