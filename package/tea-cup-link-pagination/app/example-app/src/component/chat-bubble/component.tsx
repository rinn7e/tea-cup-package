import { cn } from '@rinn7e/tea-cup-prelude'
import { Bookmark, MessageSquare, Smile, Star, Trash2 } from 'lucide-react'
import { type JSX, memo, useState } from 'react'

import { type Props } from './type'

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '🎉', '🚀', '👀']

export const ChatBubbleComponent = ({
  chat,
  isSelected,
  isFirstUnread,
  dispatch,
}: Props): JSX.Element => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(new Date(chat.timestamp))

  return (
    <div
      data-component='ChatBubbleComponent'
      className='group relative flex flex-col'
    >
      {/* Unread Indicator Divider Banner */}
      {isFirstUnread && (
        <div
          data-testid='new-messages-divider'
          className='my-3 flex items-center gap-3 px-4 select-none'
        >
          <div className='h-px flex-1 bg-rose-400/80' />
          <span className='inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-0.5 text-[10px] font-black tracking-wider text-rose-600 uppercase shadow-2xs'>
            <span className='size-1.5 animate-pulse rounded-full bg-rose-500' />
            New Messages
          </span>
          <div className='h-px flex-1 bg-rose-400/80' />
        </div>
      )}

      {/* Chat Message Row */}
      <div
        data-testid={`chat-item-${chat.id}`}
        className={cn(
          'relative flex min-h-[88px] gap-4 px-6 py-5 transition-colors duration-150 hover:bg-slate-50',
          isSelected && 'border-l-4 border-indigo-600 bg-indigo-50/70 pl-5',
          chat.isUnread && 'bg-rose-50/20',
        )}
      >
        {/* User Avatar */}
        <img
          src={chat.author.avatar}
          alt={chat.author.name}
          className='size-11 shrink-0 rounded-full object-cover ring-1 ring-slate-200'
        />

        {/* Chat Body */}
        <div className='min-w-0 flex-1'>
          {/* Header (Author, Role, Time) */}
          <div className='mb-1.5 flex items-center gap-2'>
            <span className={cn('text-sm font-semibold', chat.author.color)}>
              {chat.author.name}
            </span>
            <span className='rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase'>
              {chat.author.role}
            </span>
            <span className='text-xs text-slate-400'>{formattedTime}</span>
            {chat.isStarred && (
              <Star className='size-3.5 fill-amber-400 text-amber-500' />
            )}
          </div>

          {/* Text Content */}
          <div
            data-testid={`chat-content-${chat.id}`}
            className='text-sm leading-relaxed break-words text-slate-800'
          >
            {chat.content}
          </div>

          {/* Reactions Row */}
          {chat.reactions.length > 0 && (
            <div className='mt-2 flex flex-wrap gap-1.5'>
              {chat.reactions.map((reaction) => {
                const hasReacted = reaction.userIds.includes('user-master')
                return (
                  <button
                    key={reaction.emoji}
                    type='button'
                    data-testid={`reaction-${chat.id}-${reaction.emoji}`}
                    onClick={() =>
                      dispatch({
                        _tag: 'ToggleReaction',
                        emoji: reaction.emoji,
                      })
                    }
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors',
                      hasReacted
                        ? 'border-indigo-300 bg-indigo-50 font-semibold text-indigo-700'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
                    )}
                  >
                    <span>{reaction.emoji}</span>
                    <span className='text-[11px] font-semibold'>
                      {reaction.count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Hover Action Bar */}
        <div
          className={cn(
            'absolute -top-3 right-4 z-10 items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 shadow-md shadow-slate-200/60 transition-opacity duration-150',
            showEmojiPicker
              ? 'pointer-events-auto flex opacity-100'
              : 'pointer-events-none flex opacity-0 group-hover:pointer-events-auto group-hover:opacity-100',
          )}
        >
          <div className='relative'>
            <button
              type='button'
              data-testid={`add-reaction-btn-${chat.id}`}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className='rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800'
              title='Add Reaction'
            >
              <Smile className='size-4' />
            </button>

            {/* Quick Emoji Menu */}
            {showEmojiPicker && (
              <div className='absolute top-8 right-0 z-20 flex gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-300/50'>
                {COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type='button'
                    data-testid={`picker-emoji-${chat.id}-${emoji}`}
                    onClick={() => {
                      dispatch({ _tag: 'ToggleReaction', emoji })
                      setShowEmojiPicker(false)
                    }}
                    className='rounded p-1 text-base transition-transform hover:scale-125 hover:bg-slate-100'
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type='button'
            data-testid={`star-btn-${chat.id}`}
            onClick={() => dispatch({ _tag: 'ToggleStar' })}
            className='rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800'
            title='Star Chat'
          >
            <Bookmark className='size-4' />
          </button>

          <button
            type='button'
            data-testid={`reply-btn-${chat.id}`}
            onClick={() => dispatch({ _tag: 'Reply' })}
            className='rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800'
            title='Reply in thread'
          >
            <MessageSquare className='size-4' />
          </button>

          <button
            type='button'
            data-testid={`delete-btn-${chat.id}`}
            onClick={() => dispatch({ _tag: 'DeleteChat' })}
            className='rounded p-1.5 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600'
            title='Delete Message'
          >
            <Trash2 className='size-4' />
          </button>
        </div>
      </div>
    </div>
  )
}

export const ChatBubble = memo(ChatBubbleComponent)
