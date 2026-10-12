import * as E from 'fp-ts/lib/Either'
import * as TE from 'fp-ts/lib/TaskEither'

import * as DbChat from '../../common/cache/db/chat'
import { resetDb } from '../../common/cache/db/schema'
import { type MyDB } from '../../common/cache/db/type'
import { type HttpError } from '../type/common'

/**
 * Endpoint: Reset local cache
 */
export const resetDatabase = (
  db: MyDB | null,
): TE.TaskEither<HttpError<string>, { success: boolean }> => {
  return async () => {
    if (db) {
      await resetDb(db)
    }
    return E.right({ success: true })
  }
}

/**
 * Reset one room's chats in the local cache
 */
export const resetRoomCache = (
  db: MyDB | null,
  roomId: string,
): TE.TaskEither<HttpError<string>, { success: boolean }> => {
  return async () => {
    if (db) {
      await DbChat.deleteByRoom(db, roomId)
    }
    return E.right({ success: true })
  }
}
