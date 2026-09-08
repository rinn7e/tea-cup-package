import * as RD from '@devexperts/remote-data-ts'
import type * as CacheData from '@rinn7e/tea-cup-prelude/type/cache-data'
import * as TE from 'fp-ts/lib/TaskEither'
import { pipe } from 'fp-ts/lib/function'

import {
  type Chat,
  type ChatCurrentPrevNextResult,
  type GetChatsParams,
  type SearchChatsParams,
  type SendChatParams,
} from '../type/chat'
import { type HttpError } from '../type/common'
import { type Pagination } from '../type/pagination'
import { type Room } from '../type/room'
import { fetchJson } from './common'

// In-memory local cache per room
const LOCAL_CACHE: Record<string, Chat[]> = {}

export const getCachedChats = async (
  roomId: string,
): Promise<CacheData.Type<Chat[]>> => {
  const cached = LOCAL_CACHE[roomId]
  if (cached && cached.length > 0) {
    return {
      data: RD.success(cached),
      updatedAt: new Date(),
    }
  }
  return {
    data: RD.initial,
    updatedAt: new Date(),
  }
}

export const setCachedChats = (roomId: string, chats: Chat[]) => {
  LOCAL_CACHE[roomId] = chats
}

export const clearCachedChats = (roomId?: string) => {
  if (roomId) {
    delete LOCAL_CACHE[roomId]
  } else {
    for (const key of Object.keys(LOCAL_CACHE)) {
      delete LOCAL_CACHE[key]
    }
  }
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
  const queryParams = new URLSearchParams({
    chat_id: chatId,
    page_size: String(pageSize),
  })
  return fetchJson<ChatCurrentPrevNextResult | null>(
    `/api/rooms/${encodeURIComponent(roomId)}/chats/current_prev_next?${queryParams.toString()}`,
  )
}

/**
 * Initial load for Chat link pagination
 */
export const fetchInitialChats = (params: {
  roomId: string
  targetChatId?: string | null
  pageSize?: number
  latencyMs?: number
  networkOnline?: boolean
}): TE.TaskEither<
  HttpError<string>,
  { dataF: (curr: Chat[]) => Chat[]; nextIsMax: boolean }
> => {
  const { roomId, targetChatId, pageSize = 15 } = params

  if (targetChatId) {
    return pipe(
      getChatCurrentPrevNext(roomId, targetChatId, pageSize),
      TE.map((result) => {
        if (!result) {
          return {
            dataF: () => [],
            nextIsMax: true,
          }
        }
        const [focus, prevPage, nextPage] = result
        const all = [...prevPage.data, focus, ...nextPage.data].sort(
          (a, b) => b.timestamp - a.timestamp,
        )
        setCachedChats(roomId, all)
        return {
          dataF: () => all,
          nextIsMax: nextPage.data.length === 0,
        }
      }),
    )
  }

  return pipe(
    getChats({ roomId, pageSize }),
    TE.map((res) => {
      setCachedChats(roomId, res.data)
      return {
        dataF: () => res.data,
        nextIsMax: true,
      }
    }),
  )
}

/**
 * Endpoint: GET /api/rooms/:roomId/chats (older chats via before_timestamp)
 */
export const fetchPrevChats = (params: {
  roomId: string
  beforeTimestamp?: number
  oldestTimestamp?: number
  limit?: number
  latencyMs?: number
  networkOnline?: boolean
}): TE.TaskEither<HttpError<string>, Chat[]> => {
  const { roomId, beforeTimestamp, oldestTimestamp, limit = 15 } = params
  const ts = beforeTimestamp ?? oldestTimestamp
  return pipe(
    getChats({
      roomId,
      beforeTimestamp: ts,
      pageSize: limit,
    }),
    TE.map((res) => res.data),
  )
}

/**
 * Endpoint: GET /api/rooms/:roomId/chats (newer chats via after_timestamp)
 */
export const fetchNextChats = (params: {
  roomId: string
  afterTimestamp?: number
  newestTimestamp?: number
  limit?: number
  latencyMs?: number
  networkOnline?: boolean
}): TE.TaskEither<HttpError<string>, Chat[]> => {
  const { roomId, afterTimestamp, newestTimestamp, limit = 15 } = params
  const ts = afterTimestamp ?? newestTimestamp
  return pipe(
    getChats({
      roomId,
      afterTimestamp: ts,
      pageSize: limit,
    }),
    TE.map((res) => res.data),
  )
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
  params: SendChatParams,
): TE.TaskEither<HttpError<string>, Chat> => {
  const { roomId, content, authorId = 'user-master' } = params

  return fetchJson<Chat>(`/api/rooms/${encodeURIComponent(roomId)}/chats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, authorId }),
  })
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
export const deleteChat = (params: {
  roomId: string
  chatId: string
  latencyMs?: number
  networkOnline?: boolean
}): TE.TaskEither<HttpError<string>, void> => {
  const { roomId, chatId } = params

  return pipe(
    fetchJson<void>(
      `/api/rooms/${encodeURIComponent(roomId)}/chats/${encodeURIComponent(chatId)}`,
      {
        method: 'DELETE',
      },
    ),
    TE.map(() => {
      const cached = LOCAL_CACHE[roomId]
      if (cached) {
        LOCAL_CACHE[roomId] = cached.filter((c) => c.id !== chatId)
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
