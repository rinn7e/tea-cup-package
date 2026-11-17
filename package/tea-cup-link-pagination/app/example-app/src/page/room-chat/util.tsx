import * as LinkPagination from '@rinn7e/tea-cup-link-pagination'
import { cn } from '@rinn7e/tea-cup-prelude'
import * as ScrollContainer from '@rinn7e/tea-cup-scroll-container'
import { ArrowDown } from 'lucide-react'
import { Cmd, Sub } from 'tea-cup-fp'

import { type Chat, ChatOrd, type Reaction } from '../../api'
import { type AppRoute } from '../../common/route/type'
import { ChatBubble } from '../../component/chat-bubble'
import {
  type ChatItemMsg,
  type Msg,
  type ParentContext,
  type Props,
} from './type'

// ---------------------------------------------------------------
// Static Canonical Logic Config (CF Pattern)
// ---------------------------------------------------------------

export const logicConfig: LinkPagination.LogicConfig<
  Chat,
  ParentContext,
  ChatItemMsg
> = {
  refs: LinkPagination.mkRefs(),
  isReversed: true, // Chat mode: older chats at top, newer at bottom
  ord: ChatOrd,
  uniqueKeyField: (c: Chat) => c.id,
  // Newest at the end: the reading position is kept while older pages load
  // above it, and the end stays in view when the composer resizes the list
  scrollContainer: ScrollContainer.chatConfig,
  subscriptions: () => Sub.none(),
  update: (
    parent: ParentContext,
    msg: ChatItemMsg,
    chat: Chat,
  ): [Chat, Cmd<ChatItemMsg>] => {
    switch (msg._tag) {
      case 'ToggleReaction': {
        const existing = chat.reactions.find((r) => r.emoji === msg.emoji)
        let updatedReactions: Reaction[]

        if (existing) {
          const hasUser = existing.userIds.includes(parent.currentUserId)
          if (hasUser) {
            const newUserIds = existing.userIds.filter(
              (id) => id !== parent.currentUserId,
            )
            if (newUserIds.length === 0) {
              updatedReactions = chat.reactions.filter(
                (r) => r.emoji !== msg.emoji,
              )
            } else {
              updatedReactions = chat.reactions.map((r) =>
                r.emoji === msg.emoji
                  ? { ...r, count: newUserIds.length, userIds: newUserIds }
                  : r,
              )
            }
          } else {
            const newUserIds = [...existing.userIds, parent.currentUserId]
            updatedReactions = chat.reactions.map((r) =>
              r.emoji === msg.emoji
                ? { ...r, count: newUserIds.length, userIds: newUserIds }
                : r,
            )
          }
        } else {
          updatedReactions = [
            ...chat.reactions,
            {
              emoji: msg.emoji,
              count: 1,
              userIds: [parent.currentUserId],
            },
          ]
        }

        return [{ ...chat, reactions: updatedReactions }, Cmd.none()]
      }
      case 'ToggleStar': {
        return [{ ...chat, isStarred: !chat.isStarred }, Cmd.none()]
      }
      case 'Reply':
      case 'DeleteChat':
        return [chat, Cmd.none()]
    }
  },
}

// ---------------------------------------------------------------
// Dispatch Helpers
// ---------------------------------------------------------------

export const fromLinkPaginMsg = (
  linkPaginMsg: LinkPagination.Msg<Chat, ChatItemMsg, AppRoute>,
): Msg => ({
  _tag: 'LinkPaginMsg',
  subMsg: linkPaginMsg,
})

export const paginDispatch =
  (props: Props) => (msg: LinkPagination.Msg<Chat, ChatItemMsg, AppRoute>) => {
    props.dispatch(fromLinkPaginMsg(msg))
  }

// ---------------------------------------------------------------
// Day Labels
// ---------------------------------------------------------------

export const formatChatDateGroup = (timestamp: number | string): string => {
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  } else {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    }).format(date)
  }
}

// The first chat of a day: its row shows the day above it. `prevItem` is
// the older neighbor, drawn above it in this reversed list
export const startsDay = (
  withPrevNext: LinkPagination.WithPrevAndNext<Chat>,
): boolean =>
  withPrevNext.prevItem === null ||
  formatChatDateGroup(withPrevNext.prevItem.timestamp) !==
    formatChatDateGroup(withPrevNext.item.timestamp)

const dayLabel = (label: string) => (
  <span className='rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500'>
    {label}
  </span>
)

// The day above the first chat of a day, inside that chat's row
export const dayLabelView = (chat: Chat) => (
  <div
    data-testid='chat-day-label'
    className='flex w-full items-center justify-center pt-2 pb-1.5'
  >
    {dayLabel(formatChatDateGroup(chat.timestamp))}
  </div>
)

// The day of the chat at the top of the view, floating over the list while
// the reader scrolls
export const floatingDayLabelView = (chat: Chat, isScrolling: boolean) => (
  <div
    data-testid='chat-floating-day-label'
    className={cn(
      'pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center transition-opacity duration-200',
      isScrolling ? 'opacity-100' : 'opacity-0',
    )}
  >
    {dayLabel(formatChatDateGroup(chat.timestamp))}
  </div>
)

// ---------------------------------------------------------------
// UI Config
// ---------------------------------------------------------------

export const chatListPrevLoadingIndicator = () => (
  <div className='flex h-12 w-full items-center justify-center gap-2 text-xs font-medium text-slate-500'>
    <div className='size-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600' />
    <span>Loading older messages...</span>
  </div>
)

export const chatListNextLoadingIndicator = () => (
  <div className='flex h-12 w-full items-center justify-center gap-2 text-xs font-medium text-slate-500'>
    <div className='size-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600' />
    <span>Loading newer messages...</span>
  </div>
)

export const chatListPrevIsMaxCustomView = (_b: ParentContext) => (
  <div className='flex h-12 w-full items-center justify-center text-xs font-medium text-slate-400'>
    Beginning of conversation
  </div>
)

export const mkUiConfig = (
  props: Props,
): LinkPagination.UiConfig<Chat, ParentContext> => {
  return {
    itemPrefixUi: (withPrevNext) =>
      startsDay(withPrevNext) ? dayLabelView(withPrevNext.item) : null,
    topItemOverlayUi: (chat, isScrolling) =>
      chat ? floatingDayLabelView(chat, isScrolling) : null,

    customItemUi: ({
      withPrevNextItem,
      parent,
      selectedItem,
    }: LinkPagination.CustomUiParam<Chat, ParentContext>) => {
      const chat = withPrevNextItem.item
      const isSelected =
        parent.highlightedChatId === chat.id ||
        (selectedItem._tag === 'Some' && selectedItem.value.id === chat.id)
      const isFirstUnread = Boolean(
        parent.room?.firstUnreadChatId &&
        parent.room.firstUnreadChatId === chat.id,
      )
      return (
        <ChatBubble
          key={chat.id}
          chat={chat}
          isSelected={isSelected}
          isFirstUnread={isFirstUnread}
          dispatch={(itemMsg) =>
            paginDispatch(props)({
              _tag: 'ChildMsg',
              childId: logicConfig.uniqueKeyField(chat),
              subMsg: itemMsg,
            })
          }
        />
      )
    },

    scrollToLatestCustomUi: ({ onClick, isVisible }) => {
      return (
        <div
          className={cn(
            'absolute right-4 bottom-4 z-20 transition-all duration-200',
            isVisible
              ? 'visible scale-100 opacity-100'
              : 'pointer-events-none invisible scale-95 opacity-0',
          )}
        >
          <button
            type='button'
            data-testid='scroll-to-bottom-btn'
            onClick={onClick}
            className='flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition-all hover:bg-slate-50 hover:text-indigo-600 hover:shadow-lg focus:outline-none'
            title='Scroll to latest message'
          >
            <ArrowDown className='size-4' />
          </button>
        </div>
      )
    },

    loadingView: null,
    prevLoadingIndicatorView: chatListPrevLoadingIndicator,
    nextLoadingIndicatorView: chatListNextLoadingIndicator,
    prevIsMaxCustomView: chatListPrevIsMaxCustomView,
    nextIsMaxCustomView: () => null,
    scrollbarClass:
      'size-full overflow-y-auto overflow-x-hidden chat-scrollbar',
  }
}
