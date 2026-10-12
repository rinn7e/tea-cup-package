import * as RD from '@devexperts/remote-data-ts'
import * as CacheData from '@rinn7e/tea-cup-prelude/type/cache-data'
import * as E from 'fp-ts/lib/Either'
import type * as T from 'fp-ts/lib/Task'
import * as TE from 'fp-ts/lib/TaskEither'
import { pipe } from 'fp-ts/lib/function'

import * as DbChat from '../../common/cache/db/chat'
import { type MyDB } from '../../common/cache/db/type'
import {
  type Chat,
  type ChatCurrentPrevNextResult,
  type GetChatsParams,
  type SearchChatsParams,
  type SendChatParams,
} from '../type/chat'
import { type HttpError, mkHttpError } from '../type/common'
import { type Pagination } from '../type/pagination'
import { type Room } from '../type/room'
import { fetchJson } from './common'

// The ids of the cached chats the answer doesn't hold: deleted since
const staleIds = (cacheData: Chat[], result: Chat[]): string[] => {
  const resultIds = new Set(result.map((chat) => chat.id))
  return cacheData.map((chat) => chat.id).filter((id) => !resultIds.has(id))
}

/**
 * Endpoint: GET /api/rooms/:roomId/chats
 */
export const getChats = (
  params: GetChatsParams,
): TE.TaskEither<HttpError<string>, Pagination<Chat>> => {
  const { roomId, pageSize, beforeTimestamp, afterTimestamp } = params
  const queryParams = new URLSearchParams()
  if (pageSize) {
    queryParams.set('page_size', String(pageSize))
  }
  if (afterTimestamp !== undefined) {
    queryParams.set('after_timestamp', String(afterTimestamp))
  }
  if (beforeTimestamp !== undefined) {
    queryParams.set('before_timestamp', String(beforeTimestamp))
  }

  const query = queryParams.toString()
  return fetchJson<Pagination<Chat>>(
    `/api/rooms/${encodeURIComponent(roomId)}/chats${query ? `?${query}` : ''}`,
  )
}

/**
 * Endpoint: GET /api/rooms/:roomId/chats/one/:chatId
 */
export const getChatOne = (
  roomId: string,
  chatId: string,
): TE.TaskEither<HttpError<string>, Chat | null> => {
  return fetchJson<Chat | null>(
    `/api/rooms/${encodeURIComponent(roomId)}/chats/one/${encodeURIComponent(chatId)}`,
  )
}

/**
 * Endpoint: GET /api/rooms/:roomId/chats/current_prev_next
 */
export const getChatCurrentPrevNext = (
  roomId: string,
  chatId: string,
  pageSize = 15,
): TE.TaskEither<HttpError<string>, ChatCurrentPrevNextResult | null> => {
  const cleanChatId = chatId.replace('-repoint', '')
  const queryParams = new URLSearchParams({
    chat_id: cleanChatId,
    page_size: String(pageSize),
  })
  return fetchJson<ChatCurrentPrevNextResult | null>(
    `/api/rooms/${encodeURIComponent(roomId)}/chats/current_prev_next?${queryParams.toString()}`,
  )
}

// Chats of a room (`getChats`), with their cache: read from it while online
// (the list shows them before the answer), saved to it with the answer, and
// read from it offline
export const callChatsEndpoint = (
  db: MyDB | null,
  param: {
    roomId: string
    beforeTimestamp?: number
    afterTimestamp?: number
    pageSize: number
  },
): {
  cache: (networkStatus: boolean) => T.Task<CacheData.Type<Pagination<Chat>>>
  endpoint: (
    networkStatus: boolean,
    cacheData: Chat[],
  ) => TE.TaskEither<HttpError<string>, Pagination<Chat>>
} => ({
  cache: (networkStatus) => async () => {
    if (networkStatus && db) {
      return CacheData.fromNullable(await DbChat.read({ db, ...param }))
    } else {
      return CacheData.fromRD(RD.initial)
    }
  },
  endpoint: (networkStatus, cacheData) => {
    if (networkStatus) {
      return pipe(
        getChats(param),
        TE.chainFirstTaskK((result) => async () => {
          if (db) {
            // Update offline cache, and delete stale offline cache
            await DbChat.createMany(db, result.data)
            await DbChat.deleteMany(db, staleIds(cacheData, result.data))
          }
        }),
      )
    } else {
      return async () =>
        db
          ? E.right(await DbChat.read({ db, ...param }))
          : E.left(mkHttpError(503, 'Offline mode: sqlite is disabled'))
    }
  },
})

// A chat with a page on each side (`getChatCurrentPrevNext`), with its cache,
// as `callChatsEndpoint`
export const callChatCurrentPrevNextEndpoint = (
  db: MyDB | null,
  param: { roomId: string; chatId: string; pageSize: number },
): {
  cache: (
    networkStatus: boolean,
  ) => T.Task<CacheData.Type<ChatCurrentPrevNextResult>>
  endpoint: (
    networkStatus: boolean,
    cacheData: Chat[],
  ) => TE.TaskEither<HttpError<string>, ChatCurrentPrevNextResult | null>
} => {
  const { roomId, chatId, pageSize } = param
  return {
    cache: (networkStatus) => async () => {
      if (networkStatus && db) {
        return CacheData.fromNullable(
          await DbChat.readCurrentPrevNext(db, roomId, chatId, pageSize),
        )
      } else {
        return CacheData.fromRD(RD.initial)
      }
    },
    endpoint: (networkStatus, cacheData) => {
      if (networkStatus) {
        return pipe(
          getChatCurrentPrevNext(roomId, chatId, pageSize),
          TE.chainFirstTaskK((result) => async () => {
            if (result && db) {
              const chats = [result[0], ...result[1].data, ...result[2].data]
              // Update offline cache, and delete stale offline cache
              await DbChat.createMany(db, chats)
              await DbChat.deleteMany(db, staleIds(cacheData, chats))
            }
          }),
        )
      } else {
        return async () =>
          E.right(
            db
              ? await DbChat.readCurrentPrevNext(db, roomId, chatId, pageSize)
              : null,
          )
      }
    },
  }
}

/**
 * Endpoint: GET /api/chats/search
 */
export const searchChats = (
  params: SearchChatsParams,
): TE.TaskEither<HttpError<string>, Chat[]> => {
  const { query, roomId } = params
  const queryParams = new URLSearchParams()
  queryParams.set('query', query)
  if (roomId) {
    queryParams.set('room_id', roomId)
  }

  return fetchJson<Chat[]>(`/api/chats/search?${queryParams.toString()}`)
}

/**
 * Endpoint: POST /api/rooms/:roomId/chats
 */
export const sendChat = (
  db: MyDB | null,
  params: SendChatParams,
): TE.TaskEither<HttpError<string>, Chat> => {
  const { roomId, content, authorId = 'user-master' } = params

  return pipe(
    fetchJson<Chat>(`/api/rooms/${encodeURIComponent(roomId)}/chats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, authorId }),
    }),
    // Update offline cache
    TE.chainFirstTaskK((chat) => async () => {
      if (db) {
        await DbChat.create(db, chat)
      }
    }),
  )
}

/**
 * Endpoint: POST /api/rooms/:roomId/chats/:chatId/reactions
 */
export const toggleChatReaction = (params: {
  roomId: string
  chatId: string
  emoji: string
  userId: string
  latencyMs?: number
  networkOnline?: boolean
}): TE.TaskEither<HttpError<string>, Chat> => {
  const { roomId, chatId, emoji, userId } = params

  return fetchJson<Chat>(
    `/api/rooms/${encodeURIComponent(roomId)}/chats/${encodeURIComponent(chatId)}/reactions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji, userId }),
    },
  )
}

/**
 * Endpoint: POST /api/rooms/:roomId/chats/:chatId/star
 */
export const toggleChatStar = (params: {
  roomId: string
  chatId: string
  latencyMs?: number
  networkOnline?: boolean
}): TE.TaskEither<HttpError<string>, Chat> => {
  const { roomId, chatId } = params

  return fetchJson<Chat>(
    `/api/rooms/${encodeURIComponent(roomId)}/chats/${encodeURIComponent(chatId)}/star`,
    {
      method: 'POST',
    },
  )
}

/**
 * Endpoint: DELETE /api/rooms/:roomId/chats/:chatId
 */
export const deleteChat = (
  db: MyDB | null,
  params: {
    roomId: string
    chatId: string
    latencyMs?: number
    networkOnline?: boolean
  },
): TE.TaskEither<HttpError<string>, void> => {
  const { roomId, chatId } = params

  return pipe(
    fetchJson<void>(
      `/api/rooms/${encodeURIComponent(roomId)}/chats/${encodeURIComponent(chatId)}`,
      {
        method: 'DELETE',
      },
    ),
    // Delete it from the offline cache too
    TE.chainFirstTaskK(() => async () => {
      if (db) {
        await DbChat.deleteMany(db, [chatId])
      }
    }),
  )
}

/**
 * Endpoint: POST /api/sse/simulate (simulate incoming real-time message)
 */
export const simulateIncomingChat = (params: {
  roomId: string
  latencyMs?: number
}): TE.TaskEither<HttpError<string>, Chat> => {
  return fetchJson<Chat>('/api/sse/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId: params.roomId }),
  })
}

/**
 * Endpoint: POST /api/sse/simulate-other-room
 */
export const simulateIncomingChatToOtherRoom = (params: {
  activeRoomId: string
  latencyMs?: number
}): TE.TaskEither<HttpError<string>, { chat: Chat; room: Room }> => {
  return fetchJson<{ chat: Chat; room: Room }>('/api/sse/simulate-other-room', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activeRoomId: params.activeRoomId }),
  })
}
