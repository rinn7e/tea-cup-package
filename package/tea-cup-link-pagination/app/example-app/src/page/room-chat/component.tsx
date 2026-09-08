import { LinkPaginationMemo } from '@rinn7e/tea-cup-link-pagination/component'
import { cn } from '@rinn7e/tea-cup-prelude'
import * as O from 'fp-ts/lib/Option'
import {
  ArrowDown,
  FileText,
  Hash,
  Info,
  Lock,
  Search,
  Send,
  Users,
  X,
} from 'lucide-react'
import { type JSX, memo, useContext, useRef } from 'react'

import { type Chat, ChatEq } from '../../api'
import { SetGlobalMsgContext } from '../../common/global-context'
import { type AppRoute } from '../../common/route/type'
import { navigateToDrafts } from '../../common/util/route'
import {
  type ChatItemMsg,
  type Msg,
  type ParentContext,
  type Props,
  PropsEq,
} from './type'
import { logicConfig, mkUiConfig } from './util'

export const RoomChatPageComponent = (props: Props): JSX.Element => {
  const { model, room, dispatch, totalUnreadCount = 0 } = props
  const setGlobalMsg = useContext(SetGlobalMsgContext)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      dispatch({ _tag: 'SendChat' })
    }
  }

  const roomName = room ? room.name : model.roomId
  const roomTopic = room ? room.topic : 'General discussions and updates'
  const isPrivate = room?.isPrivate ?? false

  const uiConfig = mkUiConfig(props)
  const config = { logic: logicConfig, ui: uiConfig }

  return (
    <div
      data-testid='room-chat-page'
      data-component='RoomChatPageComponent'
      className='relative flex size-full flex-col bg-white select-none'
    >
      {/* 1. Header Bar */}
      <div className='relative z-30 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm'>
        {/* Left: Room Title & Topic */}
        <div className='flex min-w-0 items-center gap-2.5'>
          <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600'>
            {isPrivate ? (
              <Lock className='size-4 text-amber-600' />
            ) : (
              <Hash className='size-4 text-indigo-600' />
            )}
          </div>
          <div className='min-w-0'>
            <div className='flex items-center gap-2'>
              <h2
                data-testid='room-header-title'
                className='truncate text-sm font-bold text-slate-800'
              >
                {roomName}
              </h2>
              {totalUnreadCount > 0 && (
                <span
                  data-testid='room-header-unread-badge'
                  className='rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs'
                >
                  {totalUnreadCount} unread
                </span>
              )}
            </div>
            <p className='truncate text-xs text-slate-500'>{roomTopic}</p>
          </div>
        </div>

        {/* Right: Search & Actions */}
        <div className='flex items-center gap-2'>
          {/* Search Input with Popover */}
          <div className='relative'>
            <div className='relative flex items-center'>
              <Search className='pointer-events-none absolute left-2.5 size-3.5 text-slate-400' />
              <input
                type='text'
                data-testid='chat-search-input'
                placeholder='Search in room...'
                value={model.searchQuery}
                onChange={(e) =>
                  dispatch({
                    _tag: 'SetSearchQuery',
                    query: e.target.value,
                  })
                }
                className='h-8 w-44 rounded-md border border-slate-200 bg-slate-50 pr-7 pl-8 text-xs text-slate-800 placeholder-slate-400 transition-all focus:w-60 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none'
              />
              {model.searchQuery && (
                <button
                  type='button'
                  onClick={() =>
                    dispatch({ _tag: 'SetSearchQuery', query: '' })
                  }
                  className='absolute right-2 text-slate-400 hover:text-slate-600'
                >
                  <X className='size-3.5' />
                </button>
              )}
            </div>

            {/* Search Dropdown */}
            {model.isSearchDropdownOpen && model.searchResults.length > 0 && (
              <div
                data-testid='search-results-dropdown'
                className='absolute top-10 right-0 z-50 w-80 rounded-lg border border-slate-200 bg-white p-1 shadow-xl ring-1 ring-slate-900/5'
              >
                <div className='border-b border-slate-100 px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase'>
                  Search Results ({model.searchResults.length})
                </div>
                <div className='chat-scrollbar max-h-64 overflow-y-auto'>
                  {model.searchResults.map((result) => (
                    <button
                      key={result.id}
                      type='button'
                      data-testid={`search-result-item-${result.id}`}
                      onClick={() =>
                        dispatch({
                          _tag: 'JumpToChat',
                          chatId: result.id,
                        })
                      }
                      className='flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-indigo-50'
                    >
                      <div className='flex items-center justify-between'>
                        <span className='text-xs font-semibold text-slate-700'>
                          {result.author.name}
                        </span>
                        <span className='text-[10px] text-slate-400'>
                          {new Intl.DateTimeFormat('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                          }).format(new Date(result.timestamp))}
                        </span>
                      </div>
                      <p className='line-clamp-2 text-xs text-slate-600'>
                        {result.content}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Drafts Button */}
          <button
            type='button'
            data-testid='room-open-drafts-btn'
            onClick={() => navigateToDrafts(setGlobalMsg, model.roomId)}
            className='flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900'
            title='Room Drafts'
          >
            <FileText className='size-3.5 text-slate-500' />
            <span>Drafts</span>
          </button>

          {/* Members Sidebar Button */}
          <button
            type='button'
            data-testid='room-members-btn'
            onClick={() =>
              setGlobalMsg({
                _tag: 'TeaRouterMsg',
                subMsg: {
                  _tag: 'ModifyRoute',
                  func: (currentRoute) => ({
                    ...currentRoute,
                    sidebarParam: O.some({
                      _tag: 'RoomDetail',
                      tab: 'members',
                    }),
                  }),
                },
              })
            }
            className='flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900'
            title='Room Members'
          >
            <Users className='size-3.5 text-slate-500' />
            <span>{room?.membersCount ?? 12}</span>
          </button>

          {/* Details Sidebar Button */}
          <button
            type='button'
            data-testid='room-details-btn'
            onClick={() =>
              setGlobalMsg({
                _tag: 'TeaRouterMsg',
                subMsg: {
                  _tag: 'ModifyRoute',
                  func: (currentRoute) => ({
                    ...currentRoute,
                    sidebarParam: O.some({
                      _tag: 'RoomDetail',
                      tab: 'details',
                    }),
                  }),
                },
              })
            }
            className='rounded-md border border-slate-200 bg-slate-50 p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900'
            title='Room Details'
          >
            <Info className='size-4' />
          </button>
        </div>
      </div>

      {/* 1.1 Reproduction Info Banner for Bug #123 */}
      {model.highlightedChatId?.includes('repoint') && (
        <div
          data-testid='repoint-repro-banner'
          className='flex items-center justify-between border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900'
        >
          <span className='flex items-center gap-1.5 font-medium'>
            <span className='font-bold text-amber-700'>
              🐛 Bug #123 Repro:
            </span>
            <span>
              Provisional target was <code>message-1002</code>, API settled to{' '}
              <code>latest (null)</code>.
            </span>
          </span>
          <span
            data-testid='repro-status-badge'
            className='rounded bg-amber-200/80 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-900'
          >
            Target Re-point Repro
          </span>
        </div>
      )}

      {/* 2. Chat Timeline (LinkPagination Container) */}
      <div className='relative min-h-0 flex-1 overflow-hidden bg-slate-50/30'>
        <LinkPaginationMemo<Chat, ParentContext, Msg, ChatItemMsg, AppRoute>
          aEq={ChatEq}
          bEq={{ equals: () => true }}
          b={{
            currentUserId: 'user-master',
            highlightedChatId: model.highlightedChatId,
            room,
            dispatch,
          }}
          config={config}
          dispatchP={dispatch}
          mkPmsg={(subMsg) => ({
            _tag: 'LinkPaginMsg',
            subMsg,
          })}
          model={model.linkPagin}
        />

        {/* Floating Action: Jump to Unread Banner */}
        {totalUnreadCount > 0 && (
          <div className='pointer-events-none absolute top-3 left-1/2 -translate-x-1/2'>
            <button
              type='button'
              data-testid='jump-to-unread-floating-btn'
              onClick={() => dispatch({ _tag: 'JumpToUnread' })}
              className='pointer-events-auto flex items-center gap-2 rounded-full border border-rose-200 bg-rose-500 px-4 py-1.5 text-xs font-bold text-white shadow-lg transition-transform hover:scale-105 hover:bg-rose-600'
            >
              <span>{totalUnreadCount} new messages</span>
              <ArrowDown className='size-3.5' />
            </button>
          </div>
        )}
      </div>

      {/* 3. Message Composer Area */}
      <div className='border-t border-slate-200 bg-white p-3'>
        <div className='relative rounded-lg border border-slate-300 bg-slate-50/50 shadow-2xs focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-indigo-500'>
          <textarea
            ref={inputRef}
            data-testid='chat-composer-textarea'
            rows={2}
            value={model.inputDraft}
            onChange={(e) =>
              dispatch({
                _tag: 'UpdateInputDraft',
                text: e.target.value,
              })
            }
            onKeyDown={handleKeyDown}
            placeholder={`Message #${roomName}... (Press Enter to send, Shift+Enter for new line)`}
            className='w-full resize-none bg-transparent p-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none'
          />

          <div className='flex items-center justify-between border-t border-slate-200/60 px-2.5 py-1.5 text-xs text-slate-400'>
            <div className='flex items-center gap-2'>
              <span className='text-[11px]'>💡 Markdown supported</span>
            </div>
            <button
              type='button'
              data-testid='chat-send-btn'
              onClick={() => dispatch({ _tag: 'SendChat' })}
              disabled={!model.inputDraft.trim()}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold text-white shadow-xs transition-colors',
                model.inputDraft.trim()
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'cursor-not-allowed bg-slate-300',
              )}
            >
              <span>Send</span>
              <Send className='size-3' />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const RoomChatPage = memo(RoomChatPageComponent, PropsEq.equals)
export const RoomChatMemo = RoomChatPage
