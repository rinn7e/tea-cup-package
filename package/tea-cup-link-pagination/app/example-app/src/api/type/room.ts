import * as EqClass from 'fp-ts/lib/Eq'
import * as OrdClass from 'fp-ts/lib/Ord'
import { pipe } from 'fp-ts/lib/function'
import * as N from 'fp-ts/lib/number'
import * as S from 'fp-ts/lib/string'

import { type Pagination } from './pagination'

export type LastMessagePreview = {
  readonly id: string
  readonly authorName: string
  readonly content: string
  readonly timestamp: number
}

export type Room = {
  id: string
  name: string
  topic: string
  icon: string
  unreadCount: number
  firstUnreadChatId?: string | null
  orderIndex: number
  membersCount: number
  isPrivate?: boolean
  lastMessage?: LastMessagePreview | null
  lastUnreadMessage?: LastMessagePreview | null
}

export const RoomEq: EqClass.Eq<Room> = EqClass.struct<Room>({
  id: S.Eq,
  name: S.Eq,
  topic: S.Eq,
  icon: S.Eq,
  unreadCount: N.Eq,
  firstUnreadChatId: {
    equals: (a?: string | null, b?: string | null) => a === b,
  },
  orderIndex: N.Eq,
  membersCount: N.Eq,
  isPrivate: {
    equals: (a?: boolean, b?: boolean) => a === b,
  },
  lastMessage: {
    equals: (a?: LastMessagePreview | null, b?: LastMessagePreview | null) =>
      a?.id === b?.id &&
      a?.content === b?.content &&
      a?.timestamp === b?.timestamp,
  },
  lastUnreadMessage: {
    equals: (a?: LastMessagePreview | null, b?: LastMessagePreview | null) =>
      a?.id === b?.id &&
      a?.content === b?.content &&
      a?.timestamp === b?.timestamp,
  },
})

export const RoomOrd: OrdClass.Ord<Room> = pipe(
  N.Ord,
  OrdClass.contramap((r: Room) => r.lastMessage?.timestamp ?? 0),
  OrdClass.reverse,
)

export type RoomCurrentPrevNextResult = [
  Room,
  Pagination<Room>, // prev
  Pagination<Room>, // next
]

export type GetRoomsParams = {
  targetRoomId?: string | null
  beforeTimestamp?: number
  afterTimestamp?: number
  pageSize?: number
  searchString?: string
  latencyMs?: number
  networkOnline?: boolean
}
