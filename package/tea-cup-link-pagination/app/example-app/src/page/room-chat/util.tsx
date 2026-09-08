import * as LinkPagination from '@rinn7e/tea-cup-link-pagination'
import { cn } from '@rinn7e/tea-cup-prelude'
import * as EqClass from 'fp-ts/lib/Eq'
import * as S from 'fp-ts/lib/string'
import { ArrowDown } from 'lucide-react'
import { Cmd } from 'tea-cup-fp'

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
  mode: LinkPagination.defaultMode<Chat>(),
  isReversed: true, // Chat mode: older chats at top, newer at bottom
  eqWithKey: EqClass.struct({ id: S.Eq }),
  ord: ChatOrd,
  uniqueKeyField: (c: Chat) => c.id,
  visibleStrategy: { _tag: 'HalfInView' },
  update: (
    parentSt: ParentContext,
    msg: ChatItemMsg,
    chat: Chat,
  ): [Chat, Cmd<ChatItemMsg>, LinkPagination.ContainerChangeEvent] => {
    switch (msg._tag) {
      case 'ToggleReaction': {
        const existing = chat.reactions.find((r) => r.emoji === msg.emoji)
        let updatedReactions: Reaction[]

        if (existing) {
          const hasUser = existing.userIds.includes(parentSt.currentUserId)
          if (hasUser) {
            const newUserIds = existing.userIds.filter(
              (id) => id !== parentSt.currentUserId,
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
            const newUserIds = [...existing.userIds, parentSt.currentUserId]
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
              userIds: [parentSt.currentUserId],
            },
          ]
        }

        return [
          { ...chat, reactions: updatedReactions },
          Cmd.none(),
          { _tag: 'ElementModifyInPlace' },
        ]
      }
      case 'ToggleStar': {
        return [
          { ...chat, isStarred: !chat.isStarred },
          Cmd.none(),
          { _tag: 'ElementModifyInPlace' },
        ]
      }
      case 'Reply':
      case 'DeleteChat':
        return [chat, Cmd.none(), { _tag: 'NoChange' }]
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
// Date Grouping Helper
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

export const groupChatsByDate = (
  allWithPrevNext: LinkPagination.WithPrevAndNext<Chat>[],
): {
  date: string
  withPrevAndNextMessages: LinkPagination.WithPrevAndNext<Chat>[]
}[] => {
  const groups: {
    date: string
    withPrevAndNextMessages: LinkPagination.WithPrevAndNext<Chat>[]
  }[] = []

  let currentDate = ''
  let currentGroup: LinkPagination.WithPrevAndNext<Chat>[] = []

  for (const item of allWithPrevNext) {
    const itemDate = formatChatDateGroup(item.a.timestamp)
    if (itemDate !== currentDate) {
      if (currentGroup.length > 0) {
        groups.push({
          date: currentDate,
          withPrevAndNextMessages: currentGroup,
        })
      }
      currentDate = itemDate
      currentGroup = [item]
    } else {
      currentGroup.push(item)
    }
  }

  if (currentGroup.length > 0) {
    groups.push({ date: currentDate, withPrevAndNextMessages: currentGroup })
  }

  return groups
}

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
    customAllItemUi: (allA, allItemUi, isReversed) => {
      const dateGroups = groupChatsByDate(allA)
      return dateGroups.map(({ date, withPrevAndNextMessages }) => {
        const orderedMessages = isReversed
          ? withPrevAndNextMessages.reverse()
          : withPrevAndNextMessages
        return (
          <div key={date} className='relative'>
            {/* Sticky date header label */}
            <div className='pointer-events-none sticky top-2 z-20 mb-1.5 flex w-full items-center justify-center'>
              <span className='rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-xs backdrop-blur-xs'>
                {date}
              </span>
            </div>
            <div>{allItemUi(orderedMessages)}</div>
          </div>
        )
      })
    },

    customItemUi: ({
      withPrevNextA,
      b,
      selectedA,
    }: LinkPagination.CustomUiParam<Chat, ParentContext>) => {
      const chat = withPrevNextA.a
      const isSelected =
        b.highlightedChatId === chat.id ||
        (selectedA._tag === 'Some' && selectedA.value.id === chat.id)
      const isFirstUnread = Boolean(
        b.room?.firstUnreadChatId && b.room.firstUnreadChatId === chat.id,
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

    disableScrolling: false,
    titleView: null,

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
