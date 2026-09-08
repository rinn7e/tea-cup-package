import type * as LinkPagination from '@rinn7e/tea-cup-link-pagination'
import { ModelEq as LinkPaginModelEq } from '@rinn7e/tea-cup-link-pagination'
import { UndefinableEq } from '@rinn7e/tea-cup-prelude'
import * as EqClass from 'fp-ts/lib/Eq'
import * as S from 'fp-ts/lib/string'

import { type Room, RoomEq } from '../../../../api'
import { type AppRoute } from '../../../../common/route/type'
import { type RoomItemMsg } from '../room-item/type'

export type { RoomItemMsg }

export type Model = {
  readonly linkPagin: LinkPagination.Model<Room>
  readonly expandedRoomIds: Set<string>
}

export const ModelEq: EqClass.Eq<Model> = EqClass.struct<Model>({
  linkPagin: LinkPaginModelEq(RoomEq),
  expandedRoomIds: {
    equals: (a: Set<string>, b: Set<string>) =>
      a.size === b.size && [...a].every((id) => b.has(id)),
  },
})

export type Msg =
  | {
      readonly _tag: 'LinkPaginMsg'
      readonly subMsg: LinkPagination.Msg<Room, RoomItemMsg, AppRoute>
    }
  | { readonly _tag: 'SelectRoom'; readonly roomId: string }
  | { readonly _tag: 'UpdateRoomSuccess'; readonly room: Room }
  | { readonly _tag: 'NoOp' }

export type ParentContext = {
  readonly activeRoomId: string | undefined
  readonly expandedRoomIds: Set<string>
  readonly dispatch: (msg: Msg) => void
}

export const ParentContextEq: EqClass.Eq<ParentContext> =
  EqClass.struct<ParentContext>({
    activeRoomId: UndefinableEq(S.Eq),
    expandedRoomIds: {
      equals: (a: Set<string>, b: Set<string>) =>
        a.size === b.size && [...a].every((id) => b.has(id)),
    },
    dispatch: { equals: () => true },
  })

export type Props<pmsg = Msg> = {
  readonly model: Model
  readonly activeRoomId: string | undefined
  readonly dispatchP: (p: pmsg) => void
  readonly mkPmsg: (msg: Msg) => pmsg
}

export const PropsEq = <pmsg>() =>
  EqClass.struct<Props<pmsg>>({
    model: ModelEq,
    activeRoomId: UndefinableEq(S.Eq),
    dispatchP: { equals: () => true },
    mkPmsg: { equals: () => true },
  })
