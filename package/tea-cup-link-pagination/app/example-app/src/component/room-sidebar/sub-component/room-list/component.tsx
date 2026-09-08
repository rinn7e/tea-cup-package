import { LinkPaginationMemo } from '@rinn7e/tea-cup-link-pagination/component'
import { type JSX, memo } from 'react'

import { type Room, RoomEq } from '../../../../api'
import { type AppRoute } from '../../../../common/route/type'
import {
  type Msg,
  type ParentContext,
  ParentContextEq,
  type Props,
  PropsEq,
  type RoomItemMsg,
} from './type'
import { dispatch, logicConfig, mkRoomListUiConfig, noRoomView } from './util'

const RoomListInner = (props: Props<any>): JSX.Element => {
  const { model, activeRoomId } = props
  const uiConfig = mkRoomListUiConfig(props)
  const config = { logic: logicConfig, ui: uiConfig }
  const paginOverallLength = model.linkPagin.mode.overallData.value.length

  return (
    <div
      data-component='RoomListComponent'
      className='flex flex-1 flex-col overflow-hidden'
    >
      {model.linkPagin.mode.initialData._tag === 'RemoteSuccess' &&
      paginOverallLength === 0
        ? noRoomView()
        : null}

      <LinkPaginationMemo<Room, ParentContext, Msg, RoomItemMsg, AppRoute>
        aEq={RoomEq}
        bEq={ParentContextEq}
        b={{
          activeRoomId,
          expandedRoomIds: model.expandedRoomIds,
          dispatch: (msg) => dispatch(props)(msg),
        }}
        config={config}
        dispatchP={(msg) => dispatch(props)(msg)}
        mkPmsg={(subMsg) => ({ _tag: 'LinkPaginMsg', subMsg })}
        model={model.linkPagin}
      />
    </div>
  )
}

const RoomListInnerMemo = memo(RoomListInner, (prev, next) =>
  PropsEq<any>().equals(prev, next),
)

export const RoomListComponent = RoomListInner
export const RoomListMemo = <pmsg,>(props: Props<pmsg>): JSX.Element => (
  <RoomListInnerMemo {...props} />
)
