import * as E from 'fp-ts/lib/Either'
import * as TE from 'fp-ts/lib/TaskEither'

import { type HttpError } from '../type/common'
import { clearCachedChats } from './chat'
import { clearCachedRooms } from './room'

/**
 * Endpoint: Reset local cache
 */
export const resetDatabase = (): TE.TaskEither<
  HttpError<string>,
  { success: boolean }
> => {
  return async () => {
    clearCachedRooms()
    clearCachedChats()
    return E.right({ success: true })
  }
}
