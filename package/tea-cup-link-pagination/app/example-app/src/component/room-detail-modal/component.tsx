import { cn } from '@rinn7e/tea-cup-prelude'
import * as O from 'fp-ts/lib/Option'
import { Info, Shield, Users, X } from 'lucide-react'
import { type JSX, memo, useContext } from 'react'

import { SetGlobalMsgContext } from '../../common/global-context'
import { type Props } from './type'

export const RoomDetailModalComponent = ({
  model,
  activeRoom,
  users,
  dispatch,
}: Props): JSX.Element => {
  const setGlobalMsg = useContext(SetGlobalMsgContext)

  const handleClose = () => {
    setGlobalMsg({
      _tag: 'TeaRouterMsg',
      subMsg: {
        _tag: 'ModifyRoute',
        func: (currentRoute) => ({
          ...currentRoute,
          sidebarParam: O.none,
        }),
      },
    })
  }

  const handleTabChange = (tab: 'members' | 'details') => {
    dispatch({ _tag: 'SetTab', tab })
    setGlobalMsg({
      _tag: 'TeaRouterMsg',
      subMsg: {
        _tag: 'ModifyRoute',
        func: (currentRoute) => ({
          ...currentRoute,
          sidebarParam: O.some({ _tag: 'RoomDetail', tab }),
        }),
      },
    })
  }

  const handleMemberClick = (userId: string | null) => {
    dispatch({ _tag: 'SelectMember', userId })
    setGlobalMsg({
      _tag: 'TeaRouterMsg',
      subMsg: {
        _tag: 'ModifyRoute',
        func: (currentRoute) => ({
          ...currentRoute,
          sidebarParam: userId
            ? O.some({ _tag: 'MemberProfile', userId })
            : O.some({ _tag: 'RoomDetail', tab: 'members' }),
        }),
      },
    })
  }

  const selectedUser = model.selectedMemberId
    ? users.find((u) => u.id === model.selectedMemberId)
    : null

  return (
    <div
      data-component='RoomDetailModalComponent'
      data-testid='room-detail-modal-backdrop'
      className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs select-none'
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose()
        }
      }}
    >
      <div
        data-testid='room-detail-modal-content'
        className='animate-in fade-in zoom-in-95 relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl duration-150'
      >
        {/* Header & Tabs */}
        <div className='flex items-center justify-between border-b border-slate-100 pb-3'>
          <div className='flex items-center gap-1.5'>
            <button
              type='button'
              data-testid='tab-members-btn'
              onClick={() => handleTabChange('members')}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                model.activeTab === 'members'
                  ? 'bg-indigo-50 text-indigo-700 shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
              )}
            >
              <Users className='size-3.5' />
              <span>Members</span>
            </button>

            <button
              type='button'
              data-testid='tab-details-btn'
              onClick={() => handleTabChange('details')}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                model.activeTab === 'details'
                  ? 'bg-indigo-50 text-indigo-700 shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
              )}
            >
              <Info className='size-3.5' />
              <span>Details</span>
            </button>
          </div>

          <button
            type='button'
            data-testid='close-room-detail-btn'
            onClick={handleClose}
            className='rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700'
            title='Close Modal'
          >
            <X className='size-4' />
          </button>
        </div>

        {/* Selected Member Profile Card */}
        {selectedUser && (
          <div className='my-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 shadow-2xs'>
            <div className='flex items-center justify-between'>
              <span className='text-[10px] font-bold tracking-wider text-indigo-600 uppercase'>
                Member Profile
              </span>
              <button
                type='button'
                onClick={() => handleMemberClick(null)}
                className='rounded p-0.5 text-slate-400 hover:bg-white hover:text-slate-700'
              >
                <X className='size-3.5' />
              </button>
            </div>
            <div className='mt-2 flex items-center gap-2.5'>
              <img
                src={selectedUser.avatar}
                alt={selectedUser.name}
                className='size-10 rounded-full object-cover ring-2 ring-indigo-300'
              />
              <div>
                <div className='text-xs font-bold text-slate-900'>
                  {selectedUser.name}
                </div>
                <div className='text-[10px] font-semibold text-slate-500'>
                  {selectedUser.role.toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Tab Content */}
        <div className='chat-scrollbar flex-1 overflow-y-auto py-2'>
          {model.activeTab === 'members' ? (
            <div className='space-y-1'>
              <div className='px-1 py-0.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase'>
                Online Members ({users.length})
              </div>
              {users.map((user) => (
                <button
                  key={user.id}
                  type='button'
                  data-testid={`member-item-${user.id}`}
                  onClick={() => {
                    handleMemberClick(user.id)
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors',
                    model.selectedMemberId === user.id
                      ? 'bg-indigo-50 text-indigo-900'
                      : 'text-slate-700 hover:bg-slate-50',
                  )}
                >
                  <div className='relative'>
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className='size-8 rounded-full object-cover ring-1 ring-slate-200'
                    />
                    <span className='absolute right-0 bottom-0 size-2 rounded-full bg-emerald-500 ring-1 ring-white' />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div className='truncate text-xs font-semibold'>
                      {user.name}
                    </div>
                    <div className='text-[10px] text-slate-400'>
                      {user.role}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className='space-y-3 px-1 py-2 text-xs text-slate-600'>
              <div className='rounded-xl border border-slate-100 bg-slate-50 p-3'>
                <span className='font-bold text-slate-700'>Room Identity:</span>
                <div className='mt-1 font-mono font-bold text-slate-800'>
                  #{activeRoom?.name}
                </div>
              </div>

              <div className='rounded-xl border border-slate-100 bg-slate-50 p-3'>
                <span className='font-bold text-slate-700'>Topic:</span>
                <div className='mt-1 leading-relaxed text-slate-600'>
                  {activeRoom?.topic}
                </div>
              </div>

              <div className='flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3'>
                <span className='font-bold text-slate-700'>Total Members:</span>
                <span className='font-bold text-indigo-600'>
                  {activeRoom?.membersCount ?? 42}
                </span>
              </div>

              <div className='flex items-center gap-1.5 px-1 text-[11px] text-slate-400'>
                <Shield className='size-3.5 text-emerald-500' />
                <span>Encrypted Local-First Channel</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const RoomDetailModalMemo = memo(RoomDetailModalComponent)
