import { cn } from '@rinn7e/tea-cup-prelude'
import { CheckCheck, ChevronDown, ChevronUp, Star } from 'lucide-react'
import { type JSX, memo, useContext } from 'react'

import { SetGlobalMsgContext } from '../../../../common/global-context'
import { roomChatRoute } from '../../../../common/route/type'
import { type Props } from './type'

const formatChatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  if (isToday) {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export const RoomItemComponent = ({
  model,
  room,
  isActive,
  dispatch,
}: Props): JSX.Element => {
  const setGlobalMsg = useContext(SetGlobalMsgContext)
  const isExpand = model.isExpand

  // Always use the latest chat message
  const previewMsg = room.lastMessage

  const handleSelectRoom = () => {
    dispatch({ _tag: 'SelectRoom' })
    setGlobalMsg({
      _tag: 'TeaRouterMsg',
      subMsg: {
        _tag: 'ModifyRoute',
        func: (currentRoute) =>
          roomChatRoute(room.id, null, currentRoute.sidebarParam),
      },
    })
  }

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({ _tag: 'MarkAsRead' })
  }

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({ _tag: 'ToggleFavorite' })
  }

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({ _tag: 'ToggleExpand' })
  }

  return (
    <div
      data-component='RoomItemComponent'
      data-testid={`room-item-${room.id}`}
      className={cn(
        'group relative my-1.5 flex min-h-[78px] w-full flex-col justify-center rounded-xl px-4 py-4 text-left transition-all duration-150',
        isActive
          ? 'bg-indigo-600 font-bold text-white shadow-sm shadow-indigo-600/30'
          : 'text-slate-700 hover:bg-slate-100/90 hover:text-slate-900',
      )}
      onClick={handleSelectRoom}
      role='button'
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleSelectRoom()
        }
      }}
    >
      {/* Top Row: # Room Name + Date/Time + Unread Badge / Hover Action Buttons */}
      <div className='flex w-full items-center justify-between gap-1.5'>
        <div className='flex min-w-0 items-center gap-1.5'>
          <span
            className={cn(
              'text-sm font-bold select-none',
              isActive
                ? 'text-indigo-200'
                : 'text-slate-400 group-hover:text-slate-600',
            )}
          >
            #
          </span>
          <span
            data-testid={`room-btn-${room.id}`}
            className='truncate text-sm font-semibold'
          >
            {room.name}
          </span>
        </div>

        <div className='flex shrink-0 items-center gap-1.5'>
          {/* Action icons shown on hover or active */}
          <div className='hidden items-center gap-0.5 group-hover:flex'>
            {previewMsg && (
              <button
                type='button'
                title={isExpand ? 'Collapse message' : 'Expand message'}
                data-testid={`expand-btn-${room.id}`}
                onClick={handleToggleExpand}
                className={cn(
                  'rounded p-0.5 transition-colors',
                  isActive
                    ? 'text-indigo-200 hover:bg-indigo-700 hover:text-white'
                    : 'text-slate-400 hover:bg-slate-200 hover:text-slate-700',
                )}
              >
                {isExpand ? (
                  <ChevronUp className='size-3.5' />
                ) : (
                  <ChevronDown className='size-3.5' />
                )}
              </button>
            )}

            {room.unreadCount > 0 && (
              <button
                type='button'
                title='Mark as read'
                data-testid={`mark-read-btn-${room.id}`}
                onClick={handleMarkAsRead}
                className={cn(
                  'rounded p-0.5 transition-colors',
                  isActive
                    ? 'text-indigo-200 hover:bg-indigo-700 hover:text-white'
                    : 'text-slate-400 hover:bg-slate-200 hover:text-slate-700',
                )}
              >
                <CheckCheck className='size-3.5' />
              </button>
            )}

            <button
              type='button'
              title='Favorite room'
              data-testid={`favorite-btn-${room.id}`}
              onClick={handleToggleFavorite}
              className={cn(
                'rounded p-0.5 transition-colors',
                isActive
                  ? 'text-indigo-200 hover:bg-indigo-700 hover:text-white'
                  : 'text-slate-400 hover:bg-slate-200 hover:text-slate-700',
              )}
            >
              <Star className='size-3.5' />
            </button>
          </div>

          {/* Chat Date Time */}
          {previewMsg && (
            <span
              data-testid={`room-time-${room.id}`}
              className={cn(
                'text-[10px] font-medium select-none',
                isActive
                  ? 'text-indigo-200'
                  : 'text-slate-400 group-hover:text-slate-500',
              )}
            >
              {formatChatDateTime(previewMsg.timestamp)}
            </span>
          )}

          {/* Unread badge */}
          {room.unreadCount > 0 && (
            <span
              data-testid={`unread-badge-${room.id}`}
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold shadow-2xs select-none',
                isActive
                  ? 'bg-white font-black text-indigo-700'
                  : 'bg-rose-500 text-white',
              )}
            >
              {room.unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Row: Message preview snippet (Truncated vs Full Expand) */}
      {previewMsg && (
        <div
          data-testid={`room-preview-${room.id}`}
          className={cn(
            'mt-1 transition-all duration-150',
            isExpand
              ? cn(
                  'rounded-lg p-2 text-xs leading-relaxed font-normal',
                  isActive
                    ? 'bg-indigo-700/60 text-white'
                    : 'border border-slate-200/80 bg-slate-50 text-slate-700',
                )
              : cn(
                  'flex w-full items-center gap-1 truncate text-[11px] leading-tight font-normal',
                  isActive
                    ? 'text-indigo-100/90'
                    : 'text-slate-400 group-hover:text-slate-500',
                ),
          )}
        >
          {isExpand ? (
            <div className='flex flex-col gap-1'>
              <div className='flex items-center justify-between gap-1 border-b border-slate-200/50 pb-1 text-[10px] font-semibold opacity-90'>
                <span>{previewMsg.authorName}</span>
                <span>
                  {new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  }).format(new Date(previewMsg.timestamp))}
                </span>
              </div>
              <div
                data-testid={`room-preview-full-${room.id}`}
                className='break-words whitespace-pre-wrap'
              >
                {previewMsg.content}
              </div>
            </div>
          ) : (
            <>
              <span className='shrink-0 font-semibold'>
                {previewMsg.authorName}:
              </span>
              <span className='truncate'>{previewMsg.content}</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export const RoomItemMemo = memo(RoomItemComponent)
