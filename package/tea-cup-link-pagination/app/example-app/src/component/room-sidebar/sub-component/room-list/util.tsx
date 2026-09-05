import type * as LinkPagination from '@rinn7e/tea-cup-link-pagination'

import * as Api from '../../../../api'
import { RoomItemComponent } from '../room-item'
import { type Model, type Props, type RoomItemMsg } from './type'

export const mkRoomListLogicConfig = (
  model: Model,
): LinkPagination.LogicConfig<Api.Room> => ({
  refs: model.refs,
  mode: model.linkPagin.mode,
  isReversed: false, // Sidebar room list is top-to-bottom
  eqWithKey: Api.RoomEq,
  ord: Api.RoomOrd,
  uniqueKeyField: (r: Api.Room) => r.id,
  visibleStrategy: { _tag: 'HalfInView' },
  scrollStateMap: model.linkPagin.scrollStateMap,
})

export const mkRoomListUiConfig = (
  props: Props,
): LinkPagination.UiConfig<Api.Room, RoomItemMsg> => {
  const { model, activeRoomId } = props

  return {
    customItemUi: ({
      withPrevNextA,
      dispatch: itemDispatch,
    }: {
      withPrevNextA: { a: Api.Room }
      dispatch: (msg: RoomItemMsg) => void
    }) => {
      const room = withPrevNextA.a
      const isActive = room.id === activeRoomId

      return (
        <RoomItemComponent
          key={room.id}
          model={{ isExpand: model.expandedRoomIds.has(room.id) }}
          room={room}
          isActive={isActive}
          dispatch={itemDispatch}
        />
      )
    },
    scrollbarClass: 'h-full overflow-y-auto chat-scrollbar px-1 py-1',
    prevIsMaxCustomView: () => null,
    nextIsMaxCustomView: () => null,
    prevLoadingIndicatorView: () => null,
    nextLoadingIndicatorView: () => null,
  }
}
