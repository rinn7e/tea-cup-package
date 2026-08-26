import type * as TeaRouter from '@rinn7e/tea-cup-router'
import * as O from 'fp-ts/lib/Option'
import type { Cmd } from 'tea-cup-fp'

import { TeaRouterMsg } from '@/type'

import { type AppRoute, AppRouteEq, parseUrl, toUrl } from './route'
import type { Shared } from './shared'

export const mkRouterConfig = <PageModel, Msg>(
  initPageModel: (
    route: AppRoute,
    context: Shared,
    prev?: {
      readonly route: AppRoute
      readonly pageModel: PageModel
    },
  ) => [PageModel, Cmd<Msg>],
): TeaRouter.Config<AppRoute, PageModel, Shared, Msg> => ({
  parseUrl,
  toUrl,
  routeEq: AppRouteEq,
  guard: (toRoute, shared) => {
    const isLoggedIn = O.isSome(shared.user)
    const requiresAuth =
      toRoute._tag === 'SettingsPage' ||
      toRoute._tag === 'EditorPage' ||
      (toRoute._tag === 'HomePage' && toRoute.tab === 'feed')

    if (requiresAuth && !isLoggedIn) {
      return { _tag: 'Redirect', to: { _tag: 'LoginPage' } }
    }

    const requiresGuest =
      toRoute._tag === 'LoginPage' || toRoute._tag === 'SignupPage'

    if (requiresGuest && isLoggedIn) {
      return {
        _tag: 'Redirect',
        to: { _tag: 'HomePage', tab: 'global', page: 1 },
      }
    }

    return { _tag: 'Allow' }
  },
  initPageModel,
  toMsg: (subMsg) => TeaRouterMsg(subMsg) as unknown as Msg,
})
