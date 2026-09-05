import * as TE from 'fp-ts/lib/TaskEither'
import { pipe } from 'fp-ts/lib/function'

import { type DraftItem } from '../type/chat'
import { type HttpError } from '../type/common'
import { fetchJson } from './common'

/**
 * Endpoint: GET /api/rooms/:roomId/drafts
 */
export const getDrafts = (
  roomId: string,
  _latencyMs: number = 0,
): TE.TaskEither<HttpError<string>, DraftItem[]> => {
  return fetchJson<DraftItem[]>(
    `/api/rooms/${encodeURIComponent(roomId)}/drafts`,
  )
}

/**
 * Endpoint: POST /api/rooms/:roomId/drafts
 */
export const saveDraft = (
  roomId: string,
  content: string,
  _latencyMs: number = 0,
): TE.TaskEither<HttpError<string>, DraftItem> => {
  return fetchJson<DraftItem>(
    `/api/rooms/${encodeURIComponent(roomId)}/drafts`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    },
  )
}

/**
 * Endpoint: DELETE /api/rooms/:roomId/drafts/:draftId
 */
export const deleteDraft = (
  roomId: string,
  draftId: string,
  _latencyMs: number = 0,
): TE.TaskEither<HttpError<string>, { id: string }> => {
  return pipe(
    fetchJson<boolean>(
      `/api/rooms/${encodeURIComponent(roomId)}/drafts/${encodeURIComponent(draftId)}`,
      {
        method: 'DELETE',
      },
    ),
    TE.map(() => ({ id: draftId })),
  )
}
