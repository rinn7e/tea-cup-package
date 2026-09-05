import * as TeaRouter from '@rinn7e/tea-cup-router'
import * as O from 'fp-ts/lib/Option'
import { useCallback } from 'react'
import { type Dispatcher } from 'tea-cup-fp'

import { DEFAULT_USERS } from './api'
import { SetGlobalMsgContext } from './common/global-context'
import { getRoomChatPage, getRoomDraftPage } from './common/type/page-model'
import { DebugPanelMemo } from './component/debug-panel'
import { RoomDetailModalMemo } from './component/room-detail-modal'
import { RoomSidebarMemo } from './component/room-sidebar'
import { HomePageMemo } from './page/home'
import { NotFoundPage } from './page/not-found'
import { RoomChatPage } from './page/room-chat'
import { RoomDraftPage } from './page/room-draft'
import { type Model, type Msg } from './type'

export const App = ({
  model,
  dispatch,
}: {
  model: Model
  dispatch: Dispatcher<Msg>
}) => {
  const route = TeaRouter.getRoute(model.router)
  const pageModel = TeaRouter.getPageModel(model.router)

  const memoDispatch = useCallback(dispatch, [dispatch])

  // Determine activeRoom
  let activeRoomId: string | undefined
  if (route.page._tag === 'RoomChatPage') {
    activeRoomId = route.page.roomId
  } else if (route.page._tag === 'RoomDraftPage') {
    activeRoomId = route.page.roomId
  }

  const rooms = pageModel.roomSidebar.roomList.linkPagin.mode.overallData.value
  const activeRoom = activeRoomId
    ? rooms.find((r) => r.id === activeRoomId)
    : undefined

  // Loaded items count
  const chatModel = getRoomChatPage(route.page, pageModel)
  const loadedItemCount = O.isSome(chatModel)
    ? chatModel.value.linkPagin.mode.overallData.value.length
    : 0

  const totalUnreadCount = rooms.reduce((acc, r) => acc + r.unreadCount, 0)

  return (
    <SetGlobalMsgContext value={memoDispatch}>
      <div
        data-testid='app-root-container'
        data-component='App'
        className='flex h-screen w-full items-center justify-center overflow-hidden bg-slate-100 p-4 font-sans text-slate-900'
      >
        <div className='flex h-full w-full max-w-[1680px] gap-3'>
          {/* Column 1: Left Room Sidebar (LinkPagination list) */}
          <RoomSidebarMemo
            model={pageModel.roomSidebar}
            activeRoom={activeRoom}
            activeRoomId={activeRoomId}
            dispatch={(subMsg) => dispatch({ _tag: 'RoomSidebarMsg', subMsg })}
          />

          {/* Column 2: Dynamic Center Page */}
          <main className='flex min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
            {(() => {
              switch (route.page._tag) {
                case 'HomePage':
                  return <HomePageMemo rooms={rooms} />

                case 'RoomChatPage': {
                  const roomChatPage = route.page
                  const chatPageOpt = getRoomChatPage(roomChatPage, pageModel)
                  if (O.isNone(chatPageOpt)) {
                    return (
                      <div
                        data-testid='room-loading-state'
                        className='flex size-full items-center justify-center text-slate-400'
                      >
                        Loading room...
                      </div>
                    )
                  }

                  return (
                    <RoomChatPage
                      key={roomChatPage.roomId}
                      model={chatPageOpt.value}
                      room={activeRoom}
                      refs={model.shared.refs}
                      dispatch={(subMsg) =>
                        dispatch({
                          _tag: 'RoomChatPageMsg',
                          roomId: roomChatPage.roomId,
                          subMsg,
                        })
                      }
                      onMarkAsRead={() =>
                        dispatch({
                          _tag: 'MarkRoomAsReadGlobalEvent',
                          roomId: roomChatPage.roomId,
                        })
                      }
                      totalUnreadCount={activeRoom?.unreadCount ?? 0}
                    />
                  )
                }

                case 'RoomDraftPage': {
                  const draftPageOpt = getRoomDraftPage(pageModel)
                  if (O.isNone(draftPageOpt)) {
                    return (
                      <div
                        data-testid='draft-loading-state'
                        className='flex size-full items-center justify-center text-slate-400'
                      >
                        Loading drafts...
                      </div>
                    )
                  }

                  return (
                    <RoomDraftPage
                      model={draftPageOpt.value}
                      room={activeRoom}
                      dispatch={(subMsg) =>
                        dispatch({
                          _tag: 'RoomDraftPageMsg',
                          subMsg,
                        })
                      }
                    />
                  )
                }

                case 'NotFoundPage':
                  return <NotFoundPage />
              }
            })()}
          </main>

          {/* Column 3: Debug Panel */}
          <DebugPanelMemo
            model={model.debugPanel}
            loadedItemCount={loadedItemCount}
            activeRoomName={activeRoom ? activeRoom.name : activeRoomId}
            activeRoomUnreadCount={activeRoom ? activeRoom.unreadCount : 0}
            totalUnreadCount={totalUnreadCount}
            dispatch={(subMsg) => dispatch({ _tag: 'DebugPanelMsg', subMsg })}
            onSimulateSse={() =>
              dispatch({
                _tag: 'SimulateIncomingChatGlobalEvent',
                roomId: activeRoomId ?? 'room-general',
              })
            }
            onSimulateSseOtherRoom={() =>
              dispatch({ _tag: 'SimulateIncomingChatOtherRoomGlobalEvent' })
            }
            onClearCacheAndReset={() =>
              dispatch({ _tag: 'ClearCacheAndResetGlobalEvent' })
            }
            onHardReload={() =>
              dispatch({ _tag: 'ReloadActiveRoomGlobalEvent' })
            }
          />

          {/* Popover Modal: Room Details / Members */}
          {O.isSome(pageModel.roomDetailModal) && (
            <RoomDetailModalMemo
              model={pageModel.roomDetailModal.value}
              activeRoom={activeRoom}
              users={DEFAULT_USERS}
              dispatch={(subMsg) =>
                dispatch({ _tag: 'RoomDetailModalMsg', subMsg })
              }
            />
          )}
        </div>
      </div>
    </SetGlobalMsgContext>
  )
}
