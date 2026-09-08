import * as LinkPagination from '@rinn7e/tea-cup-link-pagination'
import { Cmd } from 'tea-cup-fp'

import * as Api from '../../../../api'
import { RoomItemComponent } from '../room-item'
import { type ParentContext, type RoomItemMsg } from './type'

export const mkRoomListLogicConfig = (
  refs: LinkPagination.Refs,
): LinkPagination.LogicConfig<Api.Room, ParentContext, RoomItemMsg> => ({
  refs,
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
})

export const mkRoomListUiConfig = (
  refs: LinkPagination.Refs,
): LinkPagination.UiConfig<Api.Room, ParentContext> => {
  const logicConfig = mkRoomListLogicConfig(refs)
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
            b.dispatch({
              _tag: 'LinkPaginMsg',
              subMsg: {
                _tag: 'ChildMsg',
                childId: logicConfig.uniqueKeyField(room),
                subMsg: itemMsg,
              },
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
