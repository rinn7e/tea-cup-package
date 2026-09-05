import * as EqClass from 'fp-ts/lib/Eq'
import * as O from 'fp-ts/lib/Option'
import { type Option } from 'fp-ts/lib/Option'
import * as S from 'fp-ts/lib/string'

// -----------------------------------------------------------------
// RightSidebarParam
// -----------------------------------------------------------------

export type RightSidebarTab = 'members' | 'details'

export const rightSidebarTabFromUrlString = (
  p: string | undefined,
): RightSidebarTab => {
  if (p === 'details') return 'details'
  return 'members'
}

export type RoomDetailParam = {
  readonly _tag: 'RoomDetail'
  readonly tab: RightSidebarTab
}

export type MemberProfileParam = {
  readonly _tag: 'MemberProfile'
  readonly userId: string
}

export type RightSidebarParam = RoomDetailParam | MemberProfileParam

export const RightSidebarParamEq: EqClass.Eq<RightSidebarParam> = {
  equals: (p1, p2) => {
    if (p1._tag === 'RoomDetail' && p2._tag === 'RoomDetail') {
      return p1.tab === p2.tab
    }
    if (p1._tag === 'MemberProfile' && p2._tag === 'MemberProfile') {
      return p1.userId === p2.userId
    }
    return false
  },
}

export const RightSidebarParamFromUrl = (p: {
  readonly member?: string | undefined
  readonly tab?: string | undefined
}): Option<RightSidebarParam> => {
  if (p.member) {
    return O.some({
      _tag: 'MemberProfile',
      userId: p.member,
    })
  }
  if (p.tab) {
    return O.some({
      _tag: 'RoomDetail',
      tab: rightSidebarTabFromUrlString(p.tab),
    })
  }
  return O.none
}

export const RightSidebarParamToUrl = (
  sidebarParam: Option<RightSidebarParam>,
): {
  readonly member?: string | undefined
  readonly tab?: string | undefined
} => {
  if (O.isSome(sidebarParam)) {
    const val = sidebarParam.value
    switch (val._tag) {
      case 'RoomDetail':
        return { tab: val.tab }
      case 'MemberProfile':
        return { member: val.userId }
    }
  }
  return {}
}

// -----------------------------------------------------------------
// AppPage
// -----------------------------------------------------------------

export type HomePage = {
  readonly _tag: 'HomePage'
}

export type RoomChatPage = {
  readonly _tag: 'RoomChatPage'
  readonly roomId: string
  readonly targetChatId: Option<string>
}

export type RoomDraftPage = {
  readonly _tag: 'RoomDraftPage'
  readonly roomId: string
}

export type NotFoundPage = {
  readonly _tag: 'NotFoundPage'
  readonly path: string[]
}

export type AppPage = HomePage | RoomChatPage | RoomDraftPage | NotFoundPage

export const AppPageEq: EqClass.Eq<AppPage> = {
  equals: (a, b) => {
    if (a._tag === 'HomePage' && b._tag === 'HomePage') return true
    if (a._tag === 'RoomChatPage' && b._tag === 'RoomChatPage') {
      return (
        a.roomId === b.roomId &&
        O.getEq(S.Eq).equals(a.targetChatId, b.targetChatId)
      )
    }
    if (a._tag === 'RoomDraftPage' && b._tag === 'RoomDraftPage') {
      return a.roomId === b.roomId
    }
    if (a._tag === 'NotFoundPage' && b._tag === 'NotFoundPage') {
      return (
        a.path.length === b.path.length &&
        a.path.every((p, i) => p === b.path[i])
      )
    }
    return false
  },
}

// -----------------------------------------------------------------
// AppRoute
// -----------------------------------------------------------------

export type AppRoute = {
  readonly page: AppPage
  readonly sidebarParam: Option<RightSidebarParam>
}

export const AppRouteEq: EqClass.Eq<AppRoute> = EqClass.struct<AppRoute>({
  page: AppPageEq,
  sidebarParam: O.getEq(RightSidebarParamEq),
})

// -----------------------------------------------------------------
// Constructors & Helpers
// -----------------------------------------------------------------

export const homePage = (): HomePage => ({
  _tag: 'HomePage',
})

export const roomChatPage = (
  roomId: string,
  targetChatId?: string | null,
): RoomChatPage => ({
  _tag: 'RoomChatPage',
  roomId,
  targetChatId: targetChatId ? O.some(targetChatId) : O.none,
})

export const roomDraftPage = (roomId: string): RoomDraftPage => ({
  _tag: 'RoomDraftPage',
  roomId,
})

export const notFoundPage = (path: string[]): NotFoundPage => ({
  _tag: 'NotFoundPage',
  path,
})

export const defaultAppRoute = (
  sidebarParam: Option<RightSidebarParam> = O.none,
): AppRoute => ({
  page: homePage(),
  sidebarParam,
})

export const roomChatRoute = (
  roomId: string,
  targetChatId?: string | null,
  sidebarParam: Option<RightSidebarParam> = O.none,
): AppRoute => ({
  page: roomChatPage(roomId, targetChatId),
  sidebarParam,
})

export const isSameRoomIdentity = (a: AppPage, b: AppPage): boolean => {
  if (a._tag === 'RoomChatPage' && b._tag === 'RoomChatPage') {
    return a.roomId === b.roomId
  }
  if (a._tag === 'RoomDraftPage' && b._tag === 'RoomDraftPage') {
    return a.roomId === b.roomId
  }
  return false
}
