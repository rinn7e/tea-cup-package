import * as O from 'fp-ts/lib/Option'
import { type Option } from 'fp-ts/lib/Option'
import { type Dispatcher } from 'tea-cup-fp'

import { type Msg } from '../../type'
import {
  type AppRoute,
  type RightSidebarParam,
  defaultAppRoute,
  roomChatRoute,
  roomDraftPage,
} from '../route/type'

export const changeRoute = (
  setGlobalMsg: Dispatcher<Msg>,
  route: AppRoute,
): void => {
  setGlobalMsg({
    _tag: 'TeaRouterMsg',
    subMsg: {
      _tag: 'ChangeRoute',
      route,
    },
  })
}

export const redirectToHomepage = (
  setGlobalMsg: Dispatcher<Msg>,
  sidebarParam: Option<RightSidebarParam> = O.none,
): void => {
  changeRoute(setGlobalMsg, defaultAppRoute(sidebarParam))
}

export const navigateToRoom = (
  setGlobalMsg: Dispatcher<Msg>,
  roomId: string,
  targetChatId?: string | null,
  sidebarParam: Option<RightSidebarParam> = O.none,
): void => {
  changeRoute(setGlobalMsg, roomChatRoute(roomId, targetChatId, sidebarParam))
}

export const navigateToDrafts = (
  setGlobalMsg: Dispatcher<Msg>,
  roomId: string,
): void => {
  changeRoute(setGlobalMsg, {
    page: roomDraftPage(roomId),
    sidebarParam: O.none,
  })
}

export const navigateWithSidebarParam = (
  setGlobalMsg: Dispatcher<Msg>,
  currentRoute: AppRoute,
  sidebarParam: Option<RightSidebarParam>,
): void => {
  changeRoute(setGlobalMsg, {
    ...currentRoute,
    sidebarParam,
  })
}
