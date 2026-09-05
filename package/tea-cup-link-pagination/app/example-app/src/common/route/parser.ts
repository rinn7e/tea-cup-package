import {
  Formatter,
  Match,
  Parser,
  Route,
  end,
  format,
  lit,
  parse,
  query,
  str,
  zero,
} from '@rinn7e/fp-ts-routing'
import * as O from 'fp-ts/lib/Option'
import * as t from 'io-ts'

import {
  type AppPage,
  type AppRoute,
  RightSidebarParamFromUrl,
  RightSidebarParamToUrl,
  defaultAppRoute,
  homePage,
  notFoundPage,
  roomChatPage,
  roomDraftPage,
} from './type'

// ------------------------------------------------------------------
// Any strings matcher for NotFound route
// ------------------------------------------------------------------

const anyStrings = new Match<{ path: string[] }>(
  new Parser((r) => O.some([{ path: r.parts }, new Route([], r.query)])),
  new Formatter((r, a) => new Route(r.parts.concat(a.path), r.query)),
)

// ------------------------------------------------------------------
// Params
// ------------------------------------------------------------------

const sharedParams = t.exact(
  t.partial({
    tab: t.string,
    member: t.string,
  }),
)

const toRoute =
  (page: AppPage) =>
  (p: { tab?: string; member?: string }): AppRoute => ({
    page,
    sidebarParam: RightSidebarParamFromUrl(p),
  })

const fromRoute = (route: AppRoute): { tab?: string; member?: string } => ({
  ...RightSidebarParamToUrl(route.sidebarParam),
})

// ------------------------------------------------------------------
// Matchers
// ------------------------------------------------------------------

const rootMatch = query(sharedParams).and(end)
const homeMatch = lit('app').and(query(sharedParams)).and(end)

// /rooms/:roomId/chats/:chatId
const roomChatWithChatMatch = lit('rooms')
  .and(str('roomId'))
  .and(lit('chats'))
  .and(str('chatId'))
  .and(query(sharedParams))
  .and(end)

// /rooms/:roomId/drafts
const roomDraftMatch = lit('rooms')
  .and(str('roomId'))
  .and(lit('drafts'))
  .and(query(sharedParams))
  .and(end)

// /rooms/:roomId
const roomChatMatch = lit('rooms')
  .and(str('roomId'))
  .and(query(sharedParams))
  .and(end)

// /drafts/:roomId (alternative route alias)
const draftAltMatch = lit('drafts')
  .and(str('roomId'))
  .and(query(sharedParams))
  .and(end)

const notFoundMatch = anyStrings.and(query(sharedParams)).and(end)

// ------------------------------------------------------------------
// Parser
// ------------------------------------------------------------------

const appRouter: Parser<AppRoute> = zero<AppRoute>()
  .alt(rootMatch.parser.map((p) => toRoute(homePage())(p)))
  .alt(homeMatch.parser.map((p) => toRoute(homePage())(p)))
  .alt(
    roomChatWithChatMatch.parser.map((p) =>
      toRoute(roomChatPage(p.roomId, p.chatId))(p),
    ),
  )
  .alt(roomDraftMatch.parser.map((p) => toRoute(roomDraftPage(p.roomId))(p)))
  .alt(
    roomChatMatch.parser.map((p) => toRoute(roomChatPage(p.roomId, null))(p)),
  )
  .alt(draftAltMatch.parser.map((p) => toRoute(roomDraftPage(p.roomId))(p)))
  .alt(notFoundMatch.parser.map((p) => toRoute(notFoundPage(p.path))(p)))

export const parseAppRoute = (_mainUrl: string, href: string): AppRoute => {
  return parse(appRouter, Route.parse(href), defaultAppRoute())
}

// ------------------------------------------------------------------
// Formatter
// ------------------------------------------------------------------

export const toUrlString = (r: AppRoute): string => {
  const params = fromRoute(r)
  switch (r.page._tag) {
    case 'HomePage':
      return format(rootMatch.formatter, { ...params })
    case 'RoomChatPage': {
      if (O.isSome(r.page.targetChatId)) {
        return format(roomChatWithChatMatch.formatter, {
          ...params,
          roomId: r.page.roomId,
          chatId: r.page.targetChatId.value,
        })
      }
      return format(roomChatMatch.formatter, {
        ...params,
        roomId: r.page.roomId,
      })
    }
    case 'RoomDraftPage':
      return format(roomDraftMatch.formatter, {
        ...params,
        roomId: r.page.roomId,
      })
    case 'NotFoundPage':
      return format(notFoundMatch.formatter, {
        ...params,
        path: r.page.path,
      })
  }
}
