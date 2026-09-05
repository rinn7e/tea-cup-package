import type * as LinkPagination from '@rinn7e/tea-cup-link-pagination'
import type * as TeaRouter from '@rinn7e/tea-cup-router'
import { type Cmd } from 'tea-cup-fp'

import { type AppRoute, AppRouteEq, parseAppRoute, toUrlString } from './route'
import { type PageModel } from './type/page-model'

export type Shared = {
  readonly networkOnline: boolean
  readonly latencyMs: number
  readonly refs: LinkPagination.Refs
}

// In our example app, all routes are accessible without auth restrictions
export const routerGuard: TeaRouter.RouteGuard<AppRoute, Shared> = (
  _toRoute: AppRoute,
  _shared: Shared,
): TeaRouter.GuardResult<AppRoute> => {
  return { _tag: 'Allow' }
}

export const mkRouterConfig = <Msg>(
  initPageModel: (
    route: AppRoute,
    shared: Shared,
    prev?: {
      readonly route: AppRoute
      readonly pageModel: PageModel
    },
    forceRefresh?: boolean,
  ) => [PageModel, Cmd<Msg>],
  toMsg: (subMsg: TeaRouter.Msg<AppRoute>) => Msg,
): TeaRouter.Config<AppRoute, PageModel, Shared, Msg> => ({
  parseUrl: (location: Location) =>
    parseAppRoute(location.pathname, location.href),
  toUrl: toUrlString,
  routeEq: AppRouteEq,
  guard: routerGuard,
  initPageModel,
  toMsg,
})
