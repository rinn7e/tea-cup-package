import { Hash, MessageSquare, Sparkles } from 'lucide-react'
import { type JSX, memo, useContext } from 'react'

import { type Room } from '../../api'
import { SetGlobalMsgContext } from '../../common/global-context'
import { navigateToRoom } from '../../common/util/route'

export type Props = {
  readonly rooms: Room[]
}

export const HomePageComponent = ({ rooms }: Props): JSX.Element => {
  const setGlobalMsg = useContext(SetGlobalMsgContext)
  const popularRooms = rooms.slice(0, 6)

  return (
    <div
      data-component='HomePageComponent'
      className='flex h-full flex-1 flex-col items-center justify-center p-8 text-center select-none'
    >
      <div className='max-w-md space-y-6'>
        {/* Hero Icon */}
        <div className='mx-auto flex size-16 items-center justify-center rounded-3xl bg-indigo-600/10 text-indigo-600 shadow-inner'>
          <MessageSquare className='size-8' />
        </div>

        {/* Title */}
        <div className='space-y-2'>
          <h2 className='text-2xl font-black tracking-tight text-slate-900'>
            Welcome to Tea-Cup Chat
          </h2>
          <p className='text-sm leading-relaxed text-slate-500'>
            Select a room from the sidebar or click one of the quick launchers
            below to start exploring bidirectional infinite streams.
          </p>
        </div>

        {/* Quick Launchers */}
        <div className='space-y-2 pt-2 text-left'>
          <div className='flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase'>
            <Sparkles className='size-3 text-amber-500' />
            <span>Popular Rooms</span>
          </div>
          <div className='grid grid-cols-2 gap-2'>
            {popularRooms.map((room) => (
              <button
                key={room.id}
                type='button'
                data-testid={`quick-room-${room.id}`}
                onClick={() => navigateToRoom(setGlobalMsg, room.id)}
                className='group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-left shadow-2xs transition-all hover:border-indigo-400 hover:bg-indigo-50/40 hover:shadow-xs'
              >
                <div className='flex min-w-0 items-center gap-2'>
                  <Hash className='size-4 text-indigo-500 group-hover:text-indigo-600' />
                  <span className='truncate text-xs font-bold text-slate-800 group-hover:text-indigo-900'>
                    #{room.name}
                  </span>
                </div>
                {room.unreadCount > 0 && (
                  <span className='rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white'>
                    {room.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export const HomePageMemo = memo(HomePageComponent)
