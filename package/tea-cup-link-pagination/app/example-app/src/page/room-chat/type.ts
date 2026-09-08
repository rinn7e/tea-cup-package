import type * as LinkPagination from '@rinn7e/tea-cup-link-pagination'

import { type Chat, type Room } from '../../api'
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
