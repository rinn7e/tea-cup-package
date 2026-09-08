import * as LinkPagination from '@rinn7e/tea-cup-link-pagination'
import { Cmd } from 'tea-cup-fp'

import * as Api from '../../../../api'
import { type AppRoute } from '../../../../common/route/type'
import { RoomItemComponent } from '../room-item'
import {
  type Msg,
  type ParentContext,
  type Props,
  type RoomItemMsg,
} from './type'

// ---------------------------------------------------------------
// Static Canonical Logic Config (CF Pattern)
// ---------------------------------------------------------------

export const logicConfig: LinkPagination.LogicConfig<
  Api.Room,
  ParentContext,
  RoomItemMsg
> = {
  refs: LinkPagination.mkRefs(),
  mode: LinkPagination.defaultMode<Api.Room>(),
  isReversed: false, // Sidebar room list is top-to-bottom
  eqWithKey: Api.RoomEq,
  ord: Api.RoomOrd,
  uniqueKeyField: (r: Api.Room) => r.id,
  visibleStrategy: { _tag: 'HalfInView' },
  update: (_parentSt, msg, room) => {
    switch (msg._tag) {
      case 'SelectRoom':
      case 'MarkAsRead':
      case 'ToggleExpand':
        return [room, Cmd.none(), { _tag: 'NoChange' }]
      case 'ToggleFavorite':
        return [
          { ...room, isPrivate: !room.isPrivate },
          Cmd.none(),
          { _tag: 'ElementModifyInPlace' },
        ]
    }
  },
}

// ---------------------------------------------------------------
// Dispatch Helpers
// ---------------------------------------------------------------

export const dispatch =
  <pmsg,>(props: { dispatchP: (p: pmsg) => void; mkPmsg: (m: Msg) => pmsg }) =>
  (subMsg: Msg): void =>
    props.dispatchP(props.mkPmsg(subMsg))

export const fromLinkPaginMsg = (
  linkPaginMsg: LinkPagination.Msg<Api.Room, RoomItemMsg, AppRoute>,
): Msg => ({
  _tag: 'LinkPaginMsg',
  subMsg: linkPaginMsg,
})

export const paginDispatch =
  <pmsg,>(props: Props<pmsg>) =>
  (msg: LinkPagination.Msg<Api.Room, RoomItemMsg, AppRoute>) => {
    dispatch(props)(fromLinkPaginMsg(msg))
  }

// ---------------------------------------------------------------
// Empty View
// ---------------------------------------------------------------

export const noRoomView = () => (
  <div className='flex w-full flex-col items-center justify-center p-6 text-center text-xs text-slate-400'>
    <p className='font-medium text-slate-600'>No rooms yet</p>
    <p className='mt-1 text-[11px]'>
      There are no rooms available in this list.
    </p>
  </div>
)

// ---------------------------------------------------------------
// UI Config
// ---------------------------------------------------------------

export const mkRoomListUiConfig = <pmsg,>(
  props: Props<pmsg>,
): LinkPagination.UiConfig<Api.Room, ParentContext> => {
  return {
    customItemUi: ({
      withPrevNextA,
      b,
    }: LinkPagination.CustomUiParam<Api.Room, ParentContext>) => {
      const room = withPrevNextA.a
      const isActive = room.id === b.activeRoomId

      return (
        <RoomItemComponent
          key={room.id}
          model={{ isExpand: b.expandedRoomIds.has(room.id) }}
          room={room}
          isActive={isActive}
          dispatch={(itemMsg) => {
            paginDispatch(props)({
              _tag: 'ChildMsg',
              childId: logicConfig.uniqueKeyField(room),
              subMsg: itemMsg,
            })
          }}
        />
      )
    },
    disableScrolling: false,
    titleView: null,
    scrollToLatestCustomUi: null,
    loadingView: null,
    scrollbarClass: 'h-full overflow-y-auto chat-scrollbar px-1 py-1',
    prevIsMaxCustomView: () => null,
    nextIsMaxCustomView: () => null,
    prevLoadingIndicatorView: () => null,
    nextLoadingIndicatorView: () => null,
  }
}
