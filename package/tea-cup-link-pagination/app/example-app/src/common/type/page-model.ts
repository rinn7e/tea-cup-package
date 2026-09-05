import * as M from 'fp-ts/lib/Map'
import * as O from 'fp-ts/lib/Option'
import { type Option } from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import * as S from 'fp-ts/lib/string'

import type * as RoomDetailModal from '../../component/room-detail-modal/type'
import type * as RoomSidebar from '../../component/room-sidebar/type'
import type * as RoomChatPage from '../../page/room-chat/type'
import type * as RoomDraftPage from '../../page/room-draft/type'
import { type AppPage } from '../route/type'

export type EachPageModel =
  | { readonly _tag: 'HomePageModel' }
  | { readonly _tag: 'RoomChatPageModel'; readonly roomId: string }
  | { readonly _tag: 'RoomDraftPageModel'; readonly model: RoomDraftPage.Model }
  | { readonly _tag: 'NotFoundPageModel'; readonly path: string[] }

export type PageModel = {
  readonly roomChatPageDict: Map<string, RoomChatPage.Model>
  readonly eachPageModel: EachPageModel
  readonly roomSidebar: RoomSidebar.Model
  readonly roomDetailModal: Option<RoomDetailModal.Model>
}

export const getSelectedRoomChatPage = (page: AppPage): Option<string> => {
  if (page._tag === 'RoomChatPage') {
    return O.some(page.roomId)
  }
  return O.none
}

export const getRoomChatPage = (
  page: AppPage,
  pageModel: PageModel,
): Option<RoomChatPage.Model> => {
  if (pageModel.eachPageModel._tag === 'RoomChatPageModel') {
    return pipe(
      getSelectedRoomChatPage(page),
      O.chain((roomId) =>
        O.fromNullable(pageModel.roomChatPageDict.get(roomId)),
      ),
    )
  }
  return O.none
}

export const upsertRoomChatPageDict = (
  roomId: string,
  model: RoomChatPage.Model,
  dict: Map<string, RoomChatPage.Model>,
): Map<string, RoomChatPage.Model> => M.upsertAt(S.Eq)(roomId, model)(dict)

export const getRoomDraftPage = (
  pageModel: PageModel,
): Option<RoomDraftPage.Model> => {
  if (pageModel.eachPageModel._tag === 'RoomDraftPageModel') {
    return O.some(pageModel.eachPageModel.model)
  }
  return O.none
}
