import * as RD from '@devexperts/remote-data-ts'
import * as CacheData from '@rinn7e/tea-cup-prelude/type/cache-data'
import * as E from 'fp-ts/lib/Either'
import type * as T from 'fp-ts/lib/Task'
import * as TE from 'fp-ts/lib/TaskEither'
import { pipe } from 'fp-ts/lib/function'

import * as DbRoom from '../../common/cache/db/room'
import { type MyDB } from '../../common/cache/db/type'
import { type HttpError, mkHttpError } from '../type/common'
import { type Pagination } from '../type/pagination'
import {
  type GetRoomsParams,
  type Room,
  type RoomCurrentPrevNextResult,
} from '../type/room'
import { fetchJson } from './common'

// The ids of the cached rooms the answer doesn't hold: deleted since
const staleIds = (cacheData: Room[], result: Room[]): string[] => {
  const resultIds = new Set(result.map((room) => room.id))
  return cacheData.map((room) => room.id).filter((id) => !resultIds.has(id))
}

/**
 * Endpoint: GET /api/rooms
 */
export const getRooms = (
  params?: GetRoomsParams,
): TE.TaskEither<HttpError<string>, Pagination<Room>> => {
  const queryParams = new URLSearchParams()
  if (params?.pageSize) {
    queryParams.set('page_size', String(params.pageSize))
  }
  if (params?.afterTimestamp !== undefined) {
    queryParams.set('after_timestamp', String(params.afterTimestamp))
  }
  if (params?.beforeTimestamp !== undefined) {
    queryParams.set('before_timestamp', String(params.beforeTimestamp))
  }
  if (params?.searchString) {
    queryParams.set('search_string', params.searchString)
  }

  const query = queryParams.toString()
  return fetchJson<Pagination<Room>>(`/api/rooms${query ? `?${query}` : ''}`)
}

/**
 * Endpoint: GET /api/rooms/one/:roomId
 */
export const getRoom = (
  roomId: string,
): TE.TaskEither<HttpError<string>, Room | null> => {
  return fetchJson<Room | null>(`/api/rooms/one/${encodeURIComponent(roomId)}`)
}

/**
 * Endpoint: GET /api/rooms/current_prev_next
 */
export const getRoomCurrentPrevNext = (
  roomId: string,
  pageSize = 15,
): TE.TaskEither<HttpError<string>, RoomCurrentPrevNextResult | null> => {
  const queryParams = new URLSearchParams({
    room_id: roomId,
    page_size: String(pageSize),
  })
  return fetchJson<RoomCurrentPrevNextResult | null>(
    `/api/rooms/current_prev_next?${queryParams.toString()}`,
  )
}

// Rooms (`getRooms`), with their cache: read from it while online (the list
// shows them before the answer), saved to it with the answer, and read from it
// offline
export const callRoomsEndpoint = (
  db: MyDB | null,
  param: {
    beforeTimestamp?: number
    afterTimestamp?: number
    pageSize: number
  },
): {
  cache: (networkStatus: boolean) => T.Task<CacheData.Type<Pagination<Room>>>
  endpoint: (
    networkStatus: boolean,
    cacheData: Room[],
  ) => TE.TaskEither<HttpError<string>, Pagination<Room>>
} => ({
  cache: (networkStatus) => async () => {
    if (networkStatus && db) {
      return CacheData.fromNullable(await DbRoom.read({ db, ...param }))
    } else {
      return CacheData.fromRD(RD.initial)
    }
  },
  endpoint: (networkStatus, cacheData) => {
    if (networkStatus) {
      return pipe(
        getRooms(param),
        TE.chainFirstTaskK((result) => async () => {
          if (db) {
            // Update offline cache, and delete stale offline cache
            await DbRoom.createMany(db, result.data)
            await DbRoom.deleteMany(db, staleIds(cacheData, result.data))
          }
        }),
      )
    } else {
      return async () =>
        db
          ? E.right(await DbRoom.read({ db, ...param }))
          : E.left(mkHttpError(503, 'Offline mode: sqlite is disabled'))
    }
  },
})

// A room with a page on each side (`getRoomCurrentPrevNext`), with its cache,
// as `callRoomsEndpoint`
export const callRoomCurrentPrevNextEndpoint = (
  db: MyDB | null,
  param: { roomId: string; pageSize: number },
): {
  cache: (
    networkStatus: boolean,
  ) => T.Task<CacheData.Type<RoomCurrentPrevNextResult>>
  endpoint: (
    networkStatus: boolean,
    cacheData: Room[],
  ) => TE.TaskEither<HttpError<string>, RoomCurrentPrevNextResult | null>
} => {
  const { roomId, pageSize } = param
  return {
    cache: (networkStatus) => async () => {
      if (networkStatus && db) {
        return CacheData.fromNullable(
          await DbRoom.readCurrentPrevNext(db, roomId, pageSize),
        )
      } else {
        return CacheData.fromRD(RD.initial)
      }
    },
    endpoint: (networkStatus, cacheData) => {
      if (networkStatus) {
        return pipe(
          getRoomCurrentPrevNext(roomId, pageSize),
          TE.chainFirstTaskK((result) => async () => {
            if (result && db) {
              const rooms = [result[0], ...result[1].data, ...result[2].data]
              // Update offline cache, and delete stale offline cache
              await DbRoom.createMany(db, rooms)
              await DbRoom.deleteMany(db, staleIds(cacheData, rooms))
            }
          }),
        )
      } else {
        return async () =>
          E.right(
            db ? await DbRoom.readCurrentPrevNext(db, roomId, pageSize) : null,
          )
      }
    },
  }
}
