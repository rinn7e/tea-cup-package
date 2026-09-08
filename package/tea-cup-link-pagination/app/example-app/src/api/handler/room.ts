import * as RD from '@devexperts/remote-data-ts'
import type * as CacheData from '@rinn7e/tea-cup-prelude/type/cache-data'
import * as TE from 'fp-ts/lib/TaskEither'
import { pipe } from 'fp-ts/lib/function'

import { type HttpError } from '../type/common'
import { type Pagination } from '../type/pagination'
import {
  type GetRoomsParams,
  type Room,
  type RoomCurrentPrevNextResult,
} from '../type/room'
import { fetchJson } from './common'

let LOCAL_ROOMS_CACHE: Room[] = []

export const getCachedRooms = async (): Promise<CacheData.Type<Room[]>> => {
  if (LOCAL_ROOMS_CACHE.length > 0) {
    return {
      data: RD.success(LOCAL_ROOMS_CACHE),
      updatedAt: new Date(),
    }
  }
  return {
    data: RD.initial,
    updatedAt: new Date(),
  }
}

export const setCachedRooms = (rooms: Room[]) => {
  LOCAL_ROOMS_CACHE = rooms
}

export const clearCachedRooms = () => {
  LOCAL_ROOMS_CACHE = []
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

/**
 * Initial load for Room link pagination
 */
export const fetchInitialRooms = (params: {
  targetRoomId?: string | null
  pageSize?: number
  latencyMs?: number
  networkOnline?: boolean
}): TE.TaskEither<
  HttpError<string>,
  { dataF: (curr: Room[]) => Room[]; nextIsMax: boolean }
> => {
  const { targetRoomId, pageSize = 15 } = params

  if (targetRoomId) {
    return pipe(
      getRoomCurrentPrevNext(targetRoomId, pageSize),
      TE.map((result) => {
        if (!result) {
          return {
            dataF: () => [],
            nextIsMax: true,
          }
        }
        const [focus, prevPage, nextPage] = result
        const all = [...prevPage.data, focus, ...nextPage.data].sort(
          (a, b) =>
            (b.lastMessage?.timestamp ?? 0) - (a.lastMessage?.timestamp ?? 0),
        )
        setCachedRooms(all)
        return {
          dataF: () => all,
          nextIsMax: nextPage.data.length === 0,
        }
      }),
    )
  }

  return pipe(
    getRooms({ pageSize }),
    TE.map((res) => {
      setCachedRooms(res.data)
      return {
        dataF: () => res.data,
        nextIsMax: true,
      }
    }),
  )
}

/**
 * Endpoint: GET /api/rooms (older rooms via before_timestamp)
 */
export const fetchPrevRooms = (params: {
  beforeTimestamp?: number
  limit?: number
  latencyMs?: number
  networkOnline?: boolean
}): TE.TaskEither<HttpError<string>, Room[]> => {
  const { beforeTimestamp, limit = 15 } = params
  return pipe(
    getRooms({
      beforeTimestamp,
      pageSize: limit,
    }),
    TE.map((res) => res.data),
  )
}

/**
 * Endpoint: GET /api/rooms (newer rooms via after_timestamp)
 */
export const fetchNextRooms = (params: {
  afterTimestamp?: number
  limit?: number
  latencyMs?: number
  networkOnline?: boolean
}): TE.TaskEither<HttpError<string>, Room[]> => {
  const { afterTimestamp, limit = 15 } = params
  return pipe(
    getRooms({
      afterTimestamp,
      pageSize: limit,
    }),
    TE.map((res) => res.data),
  )
}
