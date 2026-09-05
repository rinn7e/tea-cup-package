import * as TE from 'fp-ts/lib/TaskEither'

import { type User } from '../type/chat'
import { type HttpError } from '../type/common'
import { fetchJson } from './common'

/**
 * Endpoint: GET /api/users
 */
export const getUsers = (
  _latencyMs: number = 0,
): TE.TaskEither<HttpError<string>, User[]> => {
  return fetchJson<User[]>('/api/users')
}

/**
 * Endpoint: GET /api/users/:id
 */
export const getUser = (
  id: string,
  _latencyMs: number = 0,
): TE.TaskEither<HttpError<string>, User> => {
  return fetchJson<User>(`/api/users/${encodeURIComponent(id)}`)
}
