import * as EqClass from 'fp-ts/lib/Eq'
import * as OrdClass from 'fp-ts/lib/Ord'
import { pipe } from 'fp-ts/lib/function'
import * as N from 'fp-ts/lib/number'
import * as S from 'fp-ts/lib/string'

import { type Pagination } from './pagination'

export type User = {
  id: string
  name: string
  avatar: string
  role: 'admin' | 'dev' | 'designer' | 'guest'
  color: string
}

export const DEFAULT_USERS: User[] = [
  {
    id: 'user-master',
    name: 'Master',
    avatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'admin',
    color: 'text-pink-600',
  },
  {
    id: 'user-alice',
    name: 'Alice Cooper',
    avatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    role: 'dev',
    color: 'text-emerald-600',
  },
  {
    id: 'user-bob',
    name: 'Bob Marley',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    role: 'designer',
    color: 'text-amber-600',
  },
  {
    id: 'user-dana',
    name: 'Dana Scully',
    avatar:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    role: 'dev',
    color: 'text-cyan-600',
  },
  {
    id: 'user-evan',
    name: 'Evan You',
    avatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    role: 'admin',
    color: 'text-indigo-600',
  },
  {
    id: 'user-ada',
    name: 'Ada Lovelace',
    avatar:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    role: 'dev',
    color: 'text-purple-600',
  },
  {
    id: 'user-zoe',
    name: 'Zoe Saldana',
    avatar:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    role: 'designer',
    color: 'text-rose-600',
  },
]

export type Reaction = {
  emoji: string
  count: number
  userIds: string[]
}

export type Chat = {
  id: string
  roomId: string
  author: User
  content: string
  timestamp: number
  reactions: Reaction[]
  isStarred?: boolean
  isDraft?: boolean
  isUnread?: boolean
}

export const ChatEq: EqClass.Eq<Chat> = EqClass.struct<Chat>({
  id: S.Eq,
  roomId: S.Eq,
  author: EqClass.struct<User>({
    id: S.Eq,
    name: S.Eq,
    avatar: S.Eq,
    role: S.Eq,
    color: S.Eq,
  }),
  content: S.Eq,
  timestamp: N.Eq,
  reactions: {
    equals: (a: Reaction[], b: Reaction[]) => {
      if (a.length !== b.length) return false
      return a.every(
        (r, i) => r.emoji === b[i]?.emoji && r.count === b[i]?.count,
      )
    },
  },
  isStarred: {
    equals: (a?: boolean, b?: boolean) => a === b,
  },
  isDraft: {
    equals: (a?: boolean, b?: boolean) => a === b,
  },
  isUnread: {
    equals: (a?: boolean, b?: boolean) => a === b,
  },
})

export const ChatOrd: OrdClass.Ord<Chat> = pipe(
  N.Ord,
  OrdClass.contramap((c: Chat) => c.timestamp),
  OrdClass.reverse,
)

export type ChatCurrentPrevNextResult = [
  Chat,
  Pagination<Chat>, // prev
  Pagination<Chat>, // next
]

export type DraftItem = {
  readonly id: string
  readonly roomId: string
  readonly content: string
  readonly updatedAt: number
}

export type GetChatsParams = {
  roomId: string
  targetChatId?: string | null
  beforeTimestamp?: number
  afterTimestamp?: number
  oldestTimestamp?: number
  newestTimestamp?: number
  pageSize?: number
  latencyMs?: number
  networkOnline?: boolean
}

export type SendChatParams = {
  roomId: string
  content: string
  authorId?: string
  latencyMs?: number
  networkOnline?: boolean
}

export type SearchChatsParams = {
  query: string
  roomId?: string
  latencyMs?: number
  networkOnline?: boolean
}
