import { updateAndCmd } from '@rinn7e/tea-cup-prelude'
import * as TeaRouter from '@rinn7e/tea-cup-router'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import type { AppRoute, HomeTab } from '@/common/route'
import { mkRouterConfig } from '@/common/router'
import type { Shared, User } from '@/common/shared'
import {
  getStoredUser,
  removeStoredUser,
  saveStoredUser,
} from '@/common/storage'
import type * as ArticlePage from '@/page/article/type'
import * as ArticleUpdate from '@/page/article/update'
import type * as EditorPage from '@/page/editor/type'
import * as EditorUpdate from '@/page/editor/update'
import type * as HomePage from '@/page/home/type'
import * as HomeUpdate from '@/page/home/update'
import type * as LoginPage from '@/page/login/type'
import * as LoginUpdate from '@/page/login/update'
import type * as NotFoundPage from '@/page/not-found/type'
import * as NotFoundUpdate from '@/page/not-found/update'
import type * as ProfilePage from '@/page/profile/type'
import * as ProfileUpdate from '@/page/profile/update'
import type * as SettingsPage from '@/page/settings/type'
import * as SettingsUpdate from '@/page/settings/update'
import type * as SignupPage from '@/page/signup/type'
import * as SignupUpdate from '@/page/signup/update'

import type { Model, Msg, PageModel } from './type'

export const initPageModel = (
  newRoute: AppRoute,
  shared: Shared,
  prev?: {
    readonly route: AppRoute
    readonly pageModel: PageModel
  },
  forceRefresh: boolean = false,
): [PageModel, Cmd<Msg>] => {
  switch (newRoute._tag) {
    case 'HomePage': {
      const prevHome =
        !forceRefresh && prev?.pageModel._tag === 'HomePageModel'
          ? prev.pageModel.model
          : undefined
      const [homeModel, homeCmd] = HomeUpdate.init(
        { tab: newRoute.tab, page: newRoute.page },
        prevHome,
      )
      return [
        { _tag: 'HomePageModel', model: homeModel },
        homeCmd.map((subMsg) => ({ _tag: 'HomePageMsg', subMsg })),
      ]
    }

    case 'LoginPage': {
      const [loginModel, loginCmd] = LoginUpdate.init()
      return [
        { _tag: 'LoginPageModel', model: loginModel },
        loginCmd.map((subMsg) => ({ _tag: 'LoginPageMsg', subMsg })),
      ]
    }

    case 'SignupPage': {
      const [signupModel, signupCmd] = SignupUpdate.init()
      return [
        { _tag: 'SignupPageModel', model: signupModel },
        signupCmd.map((subMsg) => ({ _tag: 'SignupPageMsg', subMsg })),
      ]
    }

    case 'SettingsPage': {
      const [settingsModel, settingsCmd] = SettingsUpdate.init(shared)
      return [
        { _tag: 'SettingsPageModel', model: settingsModel },
        settingsCmd.map((subMsg) => ({ _tag: 'SettingsPageMsg', subMsg })),
      ]
    }

    case 'ProfilePage': {
      const [profileModel, profileCmd] = ProfileUpdate.init({
        username: newRoute.username,
        favorites: newRoute.favorites,
      })
      return [
        { _tag: 'ProfilePageModel', model: profileModel },
        profileCmd.map((subMsg) => ({ _tag: 'ProfilePageMsg', subMsg })),
      ]
    }

    case 'ArticlePage': {
      const [articleModel, articleCmd] = ArticleUpdate.init({
        slug: newRoute.slug,
      })
      return [
        { _tag: 'ArticlePageModel', model: articleModel },
        articleCmd.map((subMsg) => ({ _tag: 'ArticlePageMsg', subMsg })),
      ]
    }

    case 'EditorPage': {
      const [editorModel, editorCmd] = EditorUpdate.init({
        slug: newRoute.slug,
      })
      return [
        { _tag: 'EditorPageModel', model: editorModel },
        editorCmd.map((subMsg) => ({ _tag: 'EditorPageMsg', subMsg })),
      ]
    }

    case 'NotFoundPage': {
      const [notFoundModel, notFoundCmd] = NotFoundUpdate.init()
      return [
        { _tag: 'NotFoundPageModel', model: notFoundModel },
        notFoundCmd.map((subMsg) => ({ _tag: 'NotFoundPageMsg', subMsg })),
      ]
    }
  }
}

export const routerConfig = mkRouterConfig(initPageModel)

export const init = (location: Location): [Model, Cmd<Msg>] => {
  const shared: Shared = { user: getStoredUser() }
  const [routerModel, routerCmd] = TeaRouter.init(
    routerConfig,
    location,
    shared,
  )
  const model: Model = {
    router: routerModel,
    shared,
  }
  return [model, routerCmd]
}

export const routerMsgHandler = (
  subMsg: Extract<Msg, { _tag: 'TeaRouterMsg' }>['subMsg'],
  model: Model,
): [Model, Cmd<Msg>] => {
  const [routerModel, routerCmd] = TeaRouter.update(routerConfig, model.shared)(
    subMsg,
    model.router,
  )

  return [{ ...model, router: routerModel }, routerCmd]
}

const setUserMsgHandler = (
  user: O.Option<User>,
  model: Model,
): [Model, Cmd<Msg>] => {
  if (user._tag === 'Some') {
    saveStoredUser(user.value)
  } else {
    removeStoredUser()
  }
  const nextShared: Shared = { user }
  const nextModel: Model = { ...model, shared: nextShared }
  return [nextModel, Cmd.none()]
}

const homePageMsgHandler = (
  subMsg: HomePage.Msg,
  model: Model,
): [Model, Cmd<Msg>] => {
  const pageModel = TeaRouter.getPageModel(model.router)
  if (pageModel._tag === 'HomePageModel') {
    const [homeModel, homeCmd] = HomeUpdate.update(subMsg, pageModel.model)
    return pipe(
      [
        {
          ...model,
          router: TeaRouter.setPageModel(model.router, {
            _tag: 'HomePageModel',
            model: homeModel,
          }),
        },
        homeCmd.map(
          (sub): Msg => ({
            _tag: 'HomePageMsg',
            subMsg: sub,
          }),
        ),
      ] satisfies [Model, Cmd<Msg>],
      updateAndCmd((m) => {
        if (subMsg._tag === 'ChangeTab') {
          return interceptChangeTabFromHomePage(subMsg.tab)(m)
        }
        if (subMsg._tag === 'ChangePage') {
          return interceptChangePageFromHomePage(subMsg.page)(m)
        }
        if (subMsg._tag === 'ForceRefreshViaChangeRoute') {
          return interceptForceRefreshViaChangeRouteFromHomePage(m)
        }
        if (subMsg._tag === 'ModifyPageViaRouter') {
          return interceptModifyPageFromHomePage(m)
        }
        if (subMsg._tag === 'ModifyTabNoReloadViaRouter') {
          return interceptModifyTabNoReloadFromHomePage(m)
        }
        if (subMsg._tag === 'ModifyUrlNoReloadViaRouter') {
          return interceptModifyUrlNoReloadFromHomePage(m)
        }
        if (subMsg._tag === 'RefreshViaRouter') {
          return interceptRefreshFromHomePage(m)
        }
        return [m, Cmd.none()]
      }),
    )
  }
  return [model, Cmd.none()]
}

const loginPageMsgHandler = (
  subMsg: LoginPage.Msg,
  model: Model,
): [Model, Cmd<Msg>] => {
  const pageModel = TeaRouter.getPageModel(model.router)
  if (pageModel._tag === 'LoginPageModel') {
    const [loginModel, loginCmd] = LoginUpdate.update(subMsg, pageModel.model)
    return pipe(
      [
        {
          ...model,
          router: TeaRouter.setPageModel(model.router, {
            _tag: 'LoginPageModel',
            model: loginModel,
          }),
        },
        loginCmd.map(
          (sub): Msg => ({
            _tag: 'LoginPageMsg',
            subMsg: sub,
          }),
        ),
      ] satisfies [Model, Cmd<Msg>],
      updateAndCmd((m) => {
        if (subMsg._tag === 'Submit') {
          return interceptSubmitFromLoginPage(pageModel.model.email)(m)
        }
        return [m, Cmd.none()]
      }),
    )
  }
  return [model, Cmd.none()]
}

const signupPageMsgHandler = (
  subMsg: SignupPage.Msg,
  model: Model,
): [Model, Cmd<Msg>] => {
  const pageModel = TeaRouter.getPageModel(model.router)
  if (pageModel._tag === 'SignupPageModel') {
    const [signupModel, signupCmd] = SignupUpdate.update(
      subMsg,
      pageModel.model,
    )
    return pipe(
      [
        {
          ...model,
          router: TeaRouter.setPageModel(model.router, {
            _tag: 'SignupPageModel',
            model: signupModel,
          }),
        },
        signupCmd.map(
          (sub): Msg => ({
            _tag: 'SignupPageMsg',
            subMsg: sub,
          }),
        ),
      ] satisfies [Model, Cmd<Msg>],
      updateAndCmd((m) => {
        if (subMsg._tag === 'Submit') {
          return interceptSubmitFromSignupPage(pageModel.model.username)(m)
        }
        return [m, Cmd.none()]
      }),
    )
  }
  return [model, Cmd.none()]
}

const settingsPageMsgHandler = (
  subMsg: SettingsPage.Msg,
  model: Model,
): [Model, Cmd<Msg>] => {
  const pageModel = TeaRouter.getPageModel(model.router)
  if (pageModel._tag === 'SettingsPageModel') {
    const [settingsModel, settingsCmd] = SettingsUpdate.update(
      subMsg,
      pageModel.model,
    )
    return pipe(
      [
        {
          ...model,
          router: TeaRouter.setPageModel(model.router, {
            _tag: 'SettingsPageModel',
            model: settingsModel,
          }),
        },
        settingsCmd.map(
          (sub): Msg => ({
            _tag: 'SettingsPageMsg',
            subMsg: sub,
          }),
        ),
      ] satisfies [Model, Cmd<Msg>],
      updateAndCmd((m) => {
        if (subMsg._tag === 'Logout') {
          return interceptLogoutFromSettingsPage(m)
        }
        return [m, Cmd.none()]
      }),
    )
  }
  return [model, Cmd.none()]
}

const profilePageMsgHandler = (
  subMsg: ProfilePage.Msg,
  model: Model,
): [Model, Cmd<Msg>] => {
  const pageModel = TeaRouter.getPageModel(model.router)
  if (pageModel._tag === 'ProfilePageModel') {
    const [profileModel, profileCmd] = ProfileUpdate.update(
      subMsg,
      pageModel.model,
    )
    return pipe(
      [
        {
          ...model,
          router: TeaRouter.setPageModel(model.router, {
            _tag: 'ProfilePageModel',
            model: profileModel,
          }),
        },
        profileCmd.map(
          (sub): Msg => ({
            _tag: 'ProfilePageMsg',
            subMsg: sub,
          }),
        ),
      ] satisfies [Model, Cmd<Msg>],
      updateAndCmd((m) => {
        if (subMsg._tag === 'ToggleFavorites') {
          return interceptToggleFavoritesFromProfilePage(m)
        }
        return [m, Cmd.none()]
      }),
    )
  }
  return [model, Cmd.none()]
}

const articlePageMsgHandler = (
  subMsg: ArticlePage.Msg,
  model: Model,
): [Model, Cmd<Msg>] => {
  const pageModel = TeaRouter.getPageModel(model.router)
  if (pageModel._tag === 'ArticlePageModel') {
    const [articleModel, articleCmd] = ArticleUpdate.update(
      subMsg,
      pageModel.model,
    )
    return [
      {
        ...model,
        router: TeaRouter.setPageModel(model.router, {
          _tag: 'ArticlePageModel',
          model: articleModel,
        }),
      },
      articleCmd.map(
        (sub): Msg => ({
          _tag: 'ArticlePageMsg',
          subMsg: sub,
        }),
      ),
    ]
  }
  return [model, Cmd.none()]
}

const editorPageMsgHandler = (
  subMsg: EditorPage.Msg,
  model: Model,
): [Model, Cmd<Msg>] => {
  const pageModel = TeaRouter.getPageModel(model.router)
  if (pageModel._tag === 'EditorPageModel') {
    const [editorModel, editorCmd] = EditorUpdate.update(
      subMsg,
      pageModel.model,
    )
    return pipe(
      [
        {
          ...model,
          router: TeaRouter.setPageModel(model.router, {
            _tag: 'EditorPageModel',
            model: editorModel,
          }),
        },
        editorCmd.map(
          (sub): Msg => ({
            _tag: 'EditorPageMsg',
            subMsg: sub,
          }),
        ),
      ] satisfies [Model, Cmd<Msg>],
      updateAndCmd((m) => {
        if (subMsg._tag === 'Submit') {
          return interceptSubmitFromEditorPage(pageModel.model.title)(m)
        }
        return [m, Cmd.none()]
      }),
    )
  }
  return [model, Cmd.none()]
}

const notFoundPageMsgHandler = (
  subMsg: NotFoundPage.Msg,
  model: Model,
): [Model, Cmd<Msg>] => {
  const pageModel = TeaRouter.getPageModel(model.router)
  if (pageModel._tag === 'NotFoundPageModel') {
    const [notFoundModel, notFoundCmd] = NotFoundUpdate.update(
      subMsg,
      pageModel.model,
    )
    return [
      {
        ...model,
        router: TeaRouter.setPageModel(model.router, {
          _tag: 'NotFoundPageModel',
          model: notFoundModel,
        }),
      },
      notFoundCmd.map(
        (sub): Msg => ({
          _tag: 'NotFoundPageMsg',
          subMsg: sub,
        }),
      ),
    ]
  }
  return [model, Cmd.none()]
}

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'NoOp':
      return [model, Cmd.none()]

    case 'TeaRouterMsg':
      return routerMsgHandler(msg.subMsg, model)

    case 'SetUser':
      return setUserMsgHandler(msg.user, model)

    case 'HomePageMsg':
      return homePageMsgHandler(msg.subMsg, model)

    case 'LoginPageMsg':
      return loginPageMsgHandler(msg.subMsg, model)

    case 'SignupPageMsg':
      return signupPageMsgHandler(msg.subMsg, model)

    case 'SettingsPageMsg':
      return settingsPageMsgHandler(msg.subMsg, model)

    case 'ProfilePageMsg':
      return profilePageMsgHandler(msg.subMsg, model)

    case 'ArticlePageMsg':
      return articlePageMsgHandler(msg.subMsg, model)

    case 'EditorPageMsg':
      return editorPageMsgHandler(msg.subMsg, model)

    case 'NotFoundPageMsg':
      return notFoundPageMsgHandler(msg.subMsg, model)
  }
}

// Child Msg Interception Handlers
// -------------------------------------------------------------

const interceptForceRefreshViaChangeRouteFromHomePage = (
  m: Model,
): [Model, Cmd<Msg>] => {
  const currentRoute = TeaRouter.getRoute(m.router)
  return routerMsgHandler(
    { _tag: 'ChangeRoute', route: currentRoute, forceRefresh: true },
    m,
  )
}

const interceptModifyPageFromHomePage = (m: Model): [Model, Cmd<Msg>] =>
  routerMsgHandler(
    {
      _tag: 'ModifyRoute',
      func: (r) => (r._tag === 'HomePage' ? { ...r, page: r.page + 1 } : r),
    },
    m,
  )

const interceptModifyTabNoReloadFromHomePage = (m: Model): [Model, Cmd<Msg>] =>
  routerMsgHandler(
    {
      _tag: 'ModifyRouteNoReload',
      func: (r) => {
        if (r._tag !== 'HomePage') {
          return r
        }
        const nextTab: HomeTab = r.tab === 'tag' ? 'global' : 'tag'
        return {
          ...r,
          tab: nextTab,
        }
      },
    },
    m,
  )

const interceptModifyUrlNoReloadFromHomePage = (m: Model): [Model, Cmd<Msg>] =>
  routerMsgHandler(
    {
      _tag: 'ModifyRouteUrlNoReload',
      func: (r) => (r._tag === 'HomePage' ? { ...r, page: 99 } : r),
    },
    m,
  )

const interceptRefreshFromHomePage = (m: Model): [Model, Cmd<Msg>] =>
  routerMsgHandler({ _tag: 'Refresh' }, m)

const interceptChangeTabFromHomePage =
  (tab: HomeTab) =>
  (m: Model): [Model, Cmd<Msg>] => {
    if (tab === 'feed' && O.isNone(m.shared.user)) {
      return routerMsgHandler(
        { _tag: 'ChangeRoute', route: { _tag: 'LoginPage' } },
        m,
      )
    }
    return routerMsgHandler(
      {
        _tag: 'ChangeRouteNoReload',
        route: {
          _tag: 'HomePage',
          tab,
          page: 1,
        },
      },
      m,
    )
  }

const interceptChangePageFromHomePage =
  (page: number) =>
  (m: Model): [Model, Cmd<Msg>] => {
    const pageModel = TeaRouter.getPageModel(m.router)
    const currentTab =
      pageModel._tag === 'HomePageModel' ? pageModel.model.tab : 'global'
    return routerMsgHandler(
      {
        _tag: 'ChangeRouteNoReload',
        route: {
          _tag: 'HomePage',
          tab: currentTab,
          page,
        },
      },
      m,
    )
  }

const interceptSubmitFromLoginPage =
  (email: string) =>
  (m: Model): [Model, Cmd<Msg>] => {
    const username = email ? email.split('@')[0] : 'alice'
    const user: User = { username, token: 'demo-token-123' }
    saveStoredUser(user)
    const nextModel: Model = {
      ...m,
      shared: { user: O.some(user) },
    }
    return routerMsgHandler(
      {
        _tag: 'ChangeRoute',
        route: {
          _tag: 'HomePage',
          tab: 'global',
          page: 1,
        },
      },
      nextModel,
    )
  }

const interceptSubmitFromSignupPage =
  (username: string) =>
  (m: Model): [Model, Cmd<Msg>] => {
    const resolvedUsername = username || 'bob'
    const user: User = { username: resolvedUsername, token: 'demo-token-456' }
    saveStoredUser(user)
    const nextModel: Model = {
      ...m,
      shared: { user: O.some(user) },
    }
    return routerMsgHandler(
      {
        _tag: 'ChangeRoute',
        route: {
          _tag: 'HomePage',
          tab: 'global',
          page: 1,
        },
      },
      nextModel,
    )
  }

const interceptLogoutFromSettingsPage = (m: Model): [Model, Cmd<Msg>] => {
  removeStoredUser()
  const nextModel: Model = {
    ...m,
    shared: { user: O.none },
  }
  return routerMsgHandler(
    {
      _tag: 'ChangeRoute',
      route: {
        _tag: 'HomePage',
        tab: 'global',
        page: 1,
      },
    },
    nextModel,
  )
}

const interceptToggleFavoritesFromProfilePage = (
  m: Model,
): [Model, Cmd<Msg>] => {
  const pageModel = TeaRouter.getPageModel(m.router)
  if (pageModel._tag === 'ProfilePageModel') {
    return routerMsgHandler(
      {
        _tag: 'ChangeRouteNoReload',
        route: {
          _tag: 'ProfilePage',
          username: pageModel.model.username,
          favorites: pageModel.model.favorites,
        },
      },
      m,
    )
  }
  return [m, Cmd.none()]
}

const interceptSubmitFromEditorPage =
  (title: string) =>
  (m: Model): [Model, Cmd<Msg>] => {
    const slug = title.toLowerCase().replace(/\s+/g, '-') || 'my-article'
    return routerMsgHandler(
      { _tag: 'ChangeRoute', route: { _tag: 'ArticlePage', slug } },
      m,
    )
  }
