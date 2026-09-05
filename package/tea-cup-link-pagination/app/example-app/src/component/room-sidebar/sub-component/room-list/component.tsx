import { LinkPaginationComponent } from '@rinn7e/tea-cup-link-pagination/component'
import { type JSX, memo } from 'react'

import { type Room, RoomEq } from '../../../../api'
import { type Props, type RoomItemMsg } from './type'
import { mkRoomListLogicConfig, mkRoomListUiConfig } from './util'

export const RoomListComponent = (props: Props): JSX.Element => {
  const { model, dispatch } = props
  const logicConfig = mkRoomListLogicConfig(model)
  const uiConfig = mkRoomListUiConfig(props)

  return (
    <div data-component='RoomListComponent' className='flex-1 overflow-hidden'>
      <LinkPaginationComponent<Room, RoomItemMsg>
        aEq={RoomEq}
        config={{
          logic: logicConfig,
          ui: uiConfig,
        }}
        dispatch={(lpMsg) => dispatch({ _tag: 'LinkPaginMsg', subMsg: lpMsg })}
        model={model.linkPagin}
      />
    </div>
  )
}

export const RoomListMemo = memo(RoomListComponent)
