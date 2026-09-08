import type * as LinkPagination from '@rinn7e/tea-cup-link-pagination'
import { ModelEq as LinkPaginModelEq } from '@rinn7e/tea-cup-link-pagination'
import { NullableEq, UndefinableEq } from '@rinn7e/tea-cup-prelude'
import * as A from 'fp-ts/lib/Array'
import * as EqClass from 'fp-ts/lib/Eq'
import * as B from 'fp-ts/lib/boolean'
import * as S from 'fp-ts/lib/string'

import { type Chat, ChatEq, type Room, RoomEq } from '../../api'
import { type AppRoute } from '../../common/route/type'

export type ChatItemMsg =
  | { readonly _tag: 'ToggleReaction'; readonly emoji: string }
  | { readonly _tag: 'ToggleStar' }
  | { readonly _tag: 'Reply' }
  | { readonly _tag: 'DeleteChat' }

export type ParentContext = {
  readonly currentUserId: string
  readonly highlightedChatId: string | null
  readonly room: Room | undefined
  readonly dispatch: (msg: Msg) => void
}

export const ParentContextEq: EqClass.Eq<ParentContext> = EqClass.struct({
  currentUserId: S.Eq,
  highlightedChatId: NullableEq(S.Eq),
  room: UndefinableEq(RoomEq),
  dispatch: { equals: () => true },
})

export type Model = {
  readonly roomId: string
  readonly linkPagin: LinkPagination.Model<Chat>
  readonly scrollStateMap: LinkPagination.ScrollStateMap
  readonly highlightedChatId: string | null
  readonly inputDraft: string
  readonly searchQuery: string
  readonly searchResults: Chat[]
  readonly isSearchDropdownOpen: boolean
}

export const ModelEq: EqClass.Eq<Model> = EqClass.struct({
  roomId: S.Eq,
  linkPagin: LinkPaginModelEq(ChatEq),
  scrollStateMap: { equals: () => true },
  highlightedChatId: NullableEq(S.Eq),
  inputDraft: S.Eq,
  searchQuery: S.Eq,
  searchResults: A.getEq(ChatEq),
  isSearchDropdownOpen: B.Eq,
})

export type Msg =
  | {
      readonly _tag: 'LinkPaginMsg'
      readonly subMsg: LinkPagination.Msg<Chat, ChatItemMsg, AppRoute>
    }
  | { readonly _tag: 'UpdateInputDraft'; readonly text: string }
  | { readonly _tag: 'SendChat' }
  | { readonly _tag: 'SendChatSuccess'; readonly chat: Chat }
  | { readonly _tag: 'UpdateChatSuccess'; readonly chat: Chat }
  | { readonly _tag: 'DeleteChatSuccess'; readonly chatId: string }
  | { readonly _tag: 'SetSearchQuery'; readonly query: string }
  | { readonly _tag: 'SearchResponse'; readonly results: Chat[] }
  | { readonly _tag: 'CloseSearchDropdown' }
  | { readonly _tag: 'JumpToChat'; readonly chatId: string }
  | { readonly _tag: 'JumpToUnread' }
  | { readonly _tag: 'ScrollToBottom' }
  | { readonly _tag: 'NoOp' }

export type Props = {
  readonly model: Model
  readonly room: Room | undefined
  readonly refs: LinkPagination.Refs
  readonly dispatch: (msg: Msg) => void
  readonly onMarkAsRead?: () => void
  readonly totalUnreadCount?: number
}

export const PropsEq: EqClass.Eq<Props> = {
  equals: (a, b) =>
    ModelEq.equals(a.model, b.model) &&
    UndefinableEq(RoomEq).equals(a.room, b.room) &&
    (a.onMarkAsRead === b.onMarkAsRead ||
      (a.onMarkAsRead !== undefined && b.onMarkAsRead !== undefined)) &&
    (a.totalUnreadCount ?? 0) === (b.totalUnreadCount ?? 0),
}
