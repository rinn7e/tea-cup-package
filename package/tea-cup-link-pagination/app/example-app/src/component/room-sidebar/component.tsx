import { Hash } from 'lucide-react'
import { type JSX, memo, useContext } from 'react'

import { SetGlobalMsgContext } from '../../common/global-context'
import { redirectToHomepage } from '../../common/util/route'
import { RoomListMemo } from './sub-component/room-list'
import type * as RoomList from './sub-component/room-list/type'
import { type Msg, type Props } from './type'

export const RoomSidebarComponent = ({
  model,
  activeRoomId,
  dispatch,
}: Props): JSX.Element => {
  const setGlobalMsg = useContext(SetGlobalMsgContext)

  return (
    <aside
      data-component='RoomSidebarComponent'
      className='flex h-full w-72 shrink-0 flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm select-none'
    >
      {/* Top Header */}
      <div className='flex items-center justify-between border-b border-slate-100 px-2 pb-2.5'>
        <button
          type='button'
          data-testid='sidebar-home-btn'
          onClick={() => redirectToHomepage(setGlobalMsg)}
          className='flex items-center gap-1.5 text-xs font-bold tracking-tight text-slate-800 transition-colors hover:text-indigo-600 focus:outline-none'
          title='Go to Home Page'
        >
          <Hash className='size-3.5 text-indigo-600' />
          <span>Chat Rooms</span>
        </button>
        <span
          data-testid='available-rooms-badge'
          className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600'
        >
          {model.totalRoomsCount} available
        </span>
      </div>

      {/* Paginated Room List */}
      <RoomListMemo
        model={model.roomList}
        activeRoomId={activeRoomId}
        dispatchP={dispatch}
        mkPmsg={(subMsg: RoomList.Msg): Msg => ({
          _tag: 'RoomListMsg',
          subMsg,
        })}
      />
    </aside>
  )
}

export const RoomSidebarMemo = memo(RoomSidebarComponent)
