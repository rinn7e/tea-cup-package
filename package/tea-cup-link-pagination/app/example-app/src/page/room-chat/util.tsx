import type * as LinkPagination from '@rinn7e/tea-cup-link-pagination'
import * as EqClass from 'fp-ts/lib/Eq'
import * as S from 'fp-ts/lib/string'
import { Cmd } from 'tea-cup-fp'

import { type Chat, ChatOrd, type Reaction } from '../../api'
import { ChatBubble } from '../../component/chat-bubble'
import { type ChatItemMsg, type Model, type ParentContext } from './type'

export const mkLogicConfig = (
  model: Model,
  refs: LinkPagination.Refs,
): LinkPagination.LogicConfig<Chat, ParentContext, ChatItemMsg> => ({
  refs,
  mode: model.linkPagin.mode,
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
})

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

export const mkUiConfig = (): LinkPagination.UiConfig<Chat, ParentContext> => {
  return {
    customItemUi: ({
      withPrevNextA,
      b,
    }: LinkPagination.CustomUiParam<Chat, ParentContext>) => {
      const chat = withPrevNextA.a
      const prevChat = withPrevNextA.prevA
      const isSelected = b.highlightedChatId === chat.id
      const isFirstUnread = Boolean(
        chat.isUnread &&
        (prevChat
          ? !prevChat.isUnread
          : b.room?.firstUnreadChatId === chat.id ||
            (b.room?.unreadCount ?? 0) > 0),
      )
      return (
        <ChatBubble
          key={chat.id}
          chat={chat}
          isSelected={isSelected}
          isFirstUnread={isFirstUnread}
          dispatch={(itemMsg) =>
            b.dispatch({
              _tag: 'LinkPaginMsg',
              subMsg: {
                _tag: 'ChildMsg',
                childId: chat.id,
                subMsg: itemMsg,
              },
            })
          }
        />
      )
    },
    disableScrolling: false,
    titleView: null,
    scrollToLatestCustomUi: null,
    loadingView: null,
    prevLoadingIndicatorView: chatListPrevLoadingIndicator,
    nextLoadingIndicatorView: chatListNextLoadingIndicator,
    prevIsMaxCustomView: chatListPrevIsMaxCustomView,
    nextIsMaxCustomView: () => null,
    scrollbarClass:
      'size-full overflow-y-auto overflow-x-hidden chat-scrollbar',
  }
}
