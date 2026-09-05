import type * as LinkPagination from '@rinn7e/tea-cup-link-pagination'
import * as EqClass from 'fp-ts/lib/Eq'
import * as S from 'fp-ts/lib/string'

import { type Chat, ChatOrd } from '../../api'
import { ChatBubble } from '../../component/chat-bubble'
import { type ChatItemMsg, type Model, type Props } from './type'

export const mkLogicConfig = (
  model: Model,
  refs: LinkPagination.Refs,
): LinkPagination.LogicConfig<Chat> => ({
  refs,
  mode: model.linkPagin.mode,
  isReversed: true, // Chat mode: older chats at top, newer at bottom
  eqWithKey: EqClass.struct({ id: S.Eq }),
  ord: ChatOrd,
  uniqueKeyField: (c: Chat) => c.id,
  visibleStrategy: { _tag: 'HalfInView' },
  scrollStateMap: model.linkPagin.scrollStateMap,
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

export const chatListPrevIsMaxCustomView = () => (
  <div className='flex h-12 w-full items-center justify-center text-xs font-medium text-slate-400'>
    Beginning of conversation
  </div>
)

export const mkUiConfig = (
  props: Props,
): LinkPagination.UiConfig<Chat, ChatItemMsg> => {
  const { model, room, dispatch } = props

  return {
    customItemUi: ({
      withPrevNextA,
    }: {
      withPrevNextA: LinkPagination.WithPrevAndNext<Chat>
    }) => {
      const chat = withPrevNextA.a
      const prevChat = withPrevNextA.prevA
      const isSelected = model.highlightedChatId === chat.id
      const isFirstUnread = Boolean(
        chat.isUnread &&
        (prevChat
          ? !prevChat.isUnread
          : room?.firstUnreadChatId === chat.id ||
            (room?.unreadCount ?? 0) > 0),
      )
      return (
        <ChatBubble
          key={chat.id}
          chat={chat}
          isSelected={isSelected}
          isFirstUnread={isFirstUnread}
          dispatch={(itemMsg) =>
            dispatch({
              _tag: 'LinkPaginMsg',
              subMsg: {
                _tag: 'ItemMsg',
                item: chat,
                msg: itemMsg,
              },
            })
          }
        />
      )
    },
    prevLoadingIndicatorView: chatListPrevLoadingIndicator,
    nextLoadingIndicatorView: chatListNextLoadingIndicator,
    prevIsMaxCustomView: chatListPrevIsMaxCustomView,
    nextIsMaxCustomView: () => null,
    scrollbarClass:
      'size-full overflow-y-auto overflow-x-hidden chat-scrollbar',
  }
}
