import { LinkPaginationMemo } from '@rinn7e/tea-cup-link-pagination/component'
import { type JSX, memo } from 'react'

import { type Room, RoomEq } from '../../../../api'
import { type AppRoute } from '../../../../common/route/type'
import {
  type Msg,
  type ParentContext,
  type Props,
  type RoomItemMsg,
} from './type'
import { mkRoomListLogicConfig, mkRoomListUiConfig } from './util'

export const RoomListComponent = (props: Props): JSX.Element => {
  const { model, activeRoomId, dispatch } = props
  const logicConfig = mkRoomListLogicConfig(model.refs)
  const uiConfig = mkRoomListUiConfig(model.refs)

  return (
    <div data-component='RoomListComponent' className='flex-1 overflow-hidden'>
      <LinkPaginationMemo<Room, ParentContext, Msg, RoomItemMsg, AppRoute>
        aEq={RoomEq}
        bEq={{
          equals: (a, b) =>
            a.activeRoomId === b.activeRoomId &&
            a.expandedRoomIds === b.expandedRoomIds,
        }}
        b={{
          activeRoomId,
          expandedRoomIds: model.expandedRoomIds,
          dispatch,
        }}
        config={{
          logic: logicConfig,
          ui: uiConfig,
        }}
        dispatchP={(msg) => dispatch(msg)}
        mkPmsg={(subMsg) => ({ _tag: 'LinkPaginMsg', subMsg })}
        model={model.linkPagin}
      />
    </div>
  )
}

export const RoomListMemo = memo(RoomListComponent)
