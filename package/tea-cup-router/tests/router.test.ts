/* MIT License

Copyright (c) 2026 Moremi Vannak

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. */
import { Cmd, Task } from 'tea-cup-fp'
import { describe, expect, it } from 'vitest'

import {
  type Config,
  type GuardResult,
  type Model,
  type Msg,
  changeRouteHandler,
  changeRouteNoReloadHandler,
  changeRouteUrlNoReloadHandler,
  getPageModel,
  getRoute,
  getTargetRoute,
  init,
  modifyRouteHandler,
  modifyRouteNoReloadHandler,
  modifyRouteUrlNoReloadHandler,
  refreshHandler,
  resolveGuard,
  setPageModel,
  update,
  urlChangeHandler,
} from '../src'

type TestRoute =
  | { _tag: 'Home' }
  | { _tag: 'Login' }
  | { _tag: 'Settings' }
  | { _tag: 'Profile'; name: string; isAccountSetting?: boolean }
  | { _tag: 'Admin' }
  | { _tag: 'SuperAdmin' }

type TestPageModel = {
  activeTab: string
  fetchCount: number
  loadedData: string | null
}

type TestContext = {
  isLoggedIn: boolean
  currentUser: string | null
  isAdmin: boolean
}

const routeEq = {
  equals: (a: TestRoute, b: TestRoute): boolean => {
    if (a._tag !== b._tag) return false
    if (a._tag === 'Profile' && b._tag === 'Profile') {
      return (
        a.name === b.name &&
        Boolean(a.isAccountSetting) === Boolean(b.isAccountSetting)
      )
    }
    return true
  },
}

const parseUrl = (location: Location): TestRoute => {
  const path = location.pathname
  if (path === '/login') return { _tag: 'Login' }
  if (path === '/settings') return { _tag: 'Settings' }
  if (path === '/admin') return { _tag: 'Admin' }
  if (path === '/super-admin') return { _tag: 'SuperAdmin' }
  if (path.startsWith('/profile/')) {
    const name = path.replace('/profile/', '')
    const isAccountSetting = location.search.includes('account_settings=true')
    return { _tag: 'Profile', name, isAccountSetting }
  }
  return { _tag: 'Home' }
}

const toUrl = (route: TestRoute): string => {
  switch (route._tag) {
    case 'Home':
      return '/'
    case 'Login':
      return '/login'
    case 'Settings':
      return '/settings'
    case 'Admin':
      return '/admin'
    case 'SuperAdmin':
      return '/super-admin'
    case 'Profile':
      return route.isAccountSetting
        ? `/profile/${route.name}?account_settings=true`
        : `/profile/${route.name}`
  }
}

const mockFetchCmd = (label: string): Cmd<Msg<TestRoute>> =>
  Task.perform(
    () => Promise.resolve(label),
    () => ({ _tag: 'NoOp' as const }),
  )

describe('@rinn7e/tea-cup-router', () => {
  const createConfig = (
    guardFn?: (
      route: TestRoute,
      context: TestContext,
      isInternal: boolean,
    ) => GuardResult<TestRoute>,
  ): Config<TestRoute, TestPageModel, TestContext, Msg<TestRoute>> => ({
    parseUrl,
    toUrl,
    routeEq,
    guard: guardFn,
    initPageModel: (route, _context, prev, forceRefresh) => {
      const fetchCount = (prev?.pageModel.fetchCount ?? 0) + 1
      const initialTab =
        route._tag === 'Profile' && route.isAccountSetting
          ? 'account-setting-tab'
          : route._tag

      return [
        {
          activeTab: initialTab,
          fetchCount,
          loadedData: `Loaded for ${route._tag} (forceRefresh=${forceRefresh})`,
        },
        mockFetchCmd(`fetch-${route._tag}-${fetchCount}`),
      ]
    },
    toMsg: (msg) => msg,
  })

  describe('resolveGuard', () => {
    it('returns target route unchanged if no guard configured', () => {
      const config = createConfig()
      const route: TestRoute = { _tag: 'Settings' }
      const context: TestContext = {
        isLoggedIn: false,
        currentUser: null,
        isAdmin: false,
      }

      expect(resolveGuard(config, route, context)).toEqual(route)
    })

    it('resolves direct guard redirects', () => {
      const config = createConfig((route, context) => {
        if (route._tag === 'Settings' && !context.isLoggedIn) {
          return { _tag: 'Redirect', to: { _tag: 'Login' } }
        }
        return { _tag: 'Allow' }
      })

      const context: TestContext = {
        isLoggedIn: false,
        currentUser: null,
        isAdmin: false,
      }
      const guarded = resolveGuard(config, { _tag: 'Settings' }, context)
      expect(guarded).toEqual({ _tag: 'Login' })
    })

    it('resolves multi-hop redirect chains', () => {
      const config = createConfig((route, context) => {
        if (route._tag === 'SuperAdmin' && !context.isAdmin) {
          return { _tag: 'Redirect', to: { _tag: 'Admin' } }
        }
        if (route._tag === 'Admin' && !context.isLoggedIn) {
          return { _tag: 'Redirect', to: { _tag: 'Login' } }
        }
        return { _tag: 'Allow' }
      })

      const context: TestContext = {
        isLoggedIn: false,
        currentUser: null,
        isAdmin: false,
      }
      const guarded = resolveGuard(config, { _tag: 'SuperAdmin' }, context)
      expect(guarded).toEqual({ _tag: 'Login' })
    })
  })

  describe('init', () => {
    it('initializes clean model and dispatches initialPageCmd on direct URL without guard redirect', () => {
      const config = createConfig()
      const location = {
        pathname: '/',
        href: 'http://localhost/',
        search: '',
      } as Location
      const context: TestContext = {
        isLoggedIn: false,
        currentUser: null,
        isAdmin: false,
      }

      const [model, cmd] = init(config, location, context)

      expect(model.route).toEqual({ _tag: 'Home' })
      expect(model.pageModel.activeTab).toBe('Home')
      expect(model.pageModel.fetchCount).toBe(1)
      expect(model.isInternal).toBe(false)
      expect(cmd).toBeDefined()
    })

    it('resolves guard redirects BEFORE initializing PageModel and preserves initial commands (no dropped commands)', () => {
      // Simulates guard redirect: opening own profile redirects to account_settings=true
      const config = createConfig((route, context) => {
        if (
          route._tag === 'Profile' &&
          route.name === context.currentUser &&
          !route.isAccountSetting
        ) {
          return {
            _tag: 'Redirect',
            to: { _tag: 'Profile', name: route.name, isAccountSetting: true },
          }
        }
        return { _tag: 'Allow' }
      })

      const location = {
        pathname: '/profile/Rinne',
        href: 'http://localhost/profile/Rinne',
        search: '',
      } as Location
      const context: TestContext = {
        isLoggedIn: true,
        currentUser: 'Rinne',
        isAdmin: false,
      }

      const [model, cmd] = init(config, location, context)

      // 1. Guard redirected to account_settings=true
      expect(model.route).toEqual({
        _tag: 'Profile',
        name: 'Rinne',
        isAccountSetting: true,
      })

      // 2. PageModel initialized ONCE directly for the guarded route
      expect(model.pageModel.activeTab).toBe('account-setting-tab')
      expect(model.pageModel.fetchCount).toBe(1)

      // 3. Command batch includes both url update and initial page commands
      expect(cmd).toBeDefined()
    })

    it('redirects unauthenticated user from protected route at init and syncs browser URL', () => {
      const config = createConfig((route, context) => {
        if (route._tag === 'Settings' && !context.isLoggedIn) {
          return { _tag: 'Redirect', to: { _tag: 'Login' } }
        }
        return { _tag: 'Allow' }
      })

      const location = {
        pathname: '/settings',
        href: 'http://localhost/settings',
        search: '',
      } as Location
      const context: TestContext = {
        isLoggedIn: false,
        currentUser: null,
        isAdmin: false,
      }

      const [model, cmd] = init(config, location, context)

      expect(model.route).toEqual({ _tag: 'Login' })
      expect(model.pageModel.activeTab).toBe('Login')
      expect(model.pageModel.fetchCount).toBe(1)
      expect(cmd).toBeDefined()
    })
  })

  describe('update handlers and navigation', () => {
    it('ChangeRoute navigates to new route and re-initializes PageModel with prev state', () => {
      const config = createConfig()
      const context: TestContext = {
        isLoggedIn: true,
        currentUser: 'Rinne',
        isAdmin: false,
      }
      const initialModel: Model<TestRoute, TestPageModel> = {
        route: { _tag: 'Home' },
        pageModel: {
          activeTab: 'Home',
          fetchCount: 1,
          loadedData: 'initial',
        },
        isInternal: false,
      }

      const [nextModel, cmd] = changeRouteHandler(
        config,
        context,
      )({ _tag: 'Settings' })(initialModel)

      expect(nextModel.route).toEqual({ _tag: 'Settings' })
      expect(nextModel.pageModel.activeTab).toBe('Settings')
      expect(nextModel.pageModel.fetchCount).toBe(2)
      expect(nextModel.isInternal).toBe(true)
      expect(cmd).toBeDefined()
    })

    it('ChangeRouteNoReload updates route without re-initializing PageModel', () => {
      const config = createConfig()
      const initialModel: Model<TestRoute, TestPageModel> = {
        route: { _tag: 'Profile', name: 'Alice' },
        pageModel: {
          activeTab: 'profile-tab',
          fetchCount: 1,
          loadedData: 'persisted data',
        },
        isInternal: false,
      }

      const [nextModel, cmd] = changeRouteNoReloadHandler(config)({
        _tag: 'Profile',
        name: 'Alice',
        isAccountSetting: true,
      })(initialModel)

      expect(nextModel.route).toEqual({
        _tag: 'Profile',
        name: 'Alice',
        isAccountSetting: true,
      })
      // PageModel state is completely preserved
      expect(nextModel.pageModel.activeTab).toBe('profile-tab')
      expect(nextModel.pageModel.fetchCount).toBe(1)
      expect(nextModel.pageModel.loadedData).toBe('persisted data')
      expect(nextModel.isInternal).toBe(true)
      expect(cmd).toBeDefined()
    })

    it('ChangeRouteUrlNoReload updates URL bar only without changing route in Model', () => {
      const config = createConfig()
      const initialModel: Model<TestRoute, TestPageModel> = {
        route: { _tag: 'Home' },
        pageModel: {
          activeTab: 'Home',
          fetchCount: 1,
          loadedData: 'initial',
        },
        isInternal: false,
      }

      const [nextModel, cmd] = changeRouteUrlNoReloadHandler(config)({
        _tag: 'Settings',
      })(initialModel)

      expect(nextModel.route).toEqual({ _tag: 'Home' })
      expect(nextModel.pageModel.fetchCount).toBe(1)
      expect(nextModel.isInternal).toBe(true)
      expect(cmd).toBeDefined()
    })

    it('ModifyRoute transforms route and re-initializes page', () => {
      const config = createConfig()
      const context: TestContext = {
        isLoggedIn: true,
        currentUser: 'Rinne',
        isAdmin: false,
      }
      const initialModel: Model<TestRoute, TestPageModel> = {
        route: { _tag: 'Profile', name: 'Alice' },
        pageModel: {
          activeTab: 'Profile',
          fetchCount: 1,
          loadedData: 'initial',
        },
        isInternal: false,
      }

      const [nextModel] = modifyRouteHandler(
        config,
        context,
      )((r) =>
        r._tag === 'Profile'
          ? { ...r, isAccountSetting: true }
          : { _tag: 'Home' },
      )(initialModel)

      expect(nextModel.route).toEqual({
        _tag: 'Profile',
        name: 'Alice',
        isAccountSetting: true,
      })
      expect(nextModel.pageModel.fetchCount).toBe(2)
    })

    it('ModifyRouteNoReload transforms route in place without re-initializing PageModel', () => {
      const config = createConfig()
      const initialModel: Model<TestRoute, TestPageModel> = {
        route: { _tag: 'Profile', name: 'Bob' },
        pageModel: {
          activeTab: 'Profile',
          fetchCount: 1,
          loadedData: 'preserved',
        },
        isInternal: false,
      }

      const [nextModel] = modifyRouteNoReloadHandler(config)((r) =>
        r._tag === 'Profile'
          ? { ...r, isAccountSetting: true }
          : { _tag: 'Home' },
      )(initialModel)

      expect(nextModel.route).toEqual({
        _tag: 'Profile',
        name: 'Bob',
        isAccountSetting: true,
      })
      expect(nextModel.pageModel.fetchCount).toBe(1)
      expect(nextModel.pageModel.loadedData).toBe('preserved')
    })

    it('Refresh forces re-initialization of current route with forceRefresh=true', () => {
      const config = createConfig()
      const context: TestContext = {
        isLoggedIn: true,
        currentUser: 'Rinne',
        isAdmin: false,
      }
      const initialModel: Model<TestRoute, TestPageModel> = {
        route: { _tag: 'Home' },
        pageModel: {
          activeTab: 'Home',
          fetchCount: 1,
          loadedData: 'initial',
        },
        isInternal: false,
      }

      const [nextModel] = refreshHandler(config, context)(initialModel)

      expect(nextModel.route).toEqual({ _tag: 'Home' })
      expect(nextModel.pageModel.fetchCount).toBe(2)
      expect(nextModel.pageModel.loadedData).toContain('forceRefresh=true')
    })

    it('UrlChange resets isInternal when true without re-navigating', () => {
      const config = createConfig()
      const context: TestContext = {
        isLoggedIn: true,
        currentUser: 'Rinne',
        isAdmin: false,
      }
      const initialModel: Model<TestRoute, TestPageModel> = {
        route: { _tag: 'Home' },
        pageModel: {
          activeTab: 'Home',
          fetchCount: 1,
          loadedData: 'initial',
        },
        isInternal: true,
      }

      const location = {
        pathname: '/settings',
        href: 'http://localhost/settings',
        search: '',
      } as Location

      const [nextModel, cmd] = urlChangeHandler(config, context)(location)(
        initialModel,
      )

      // Internal flag reset, route NOT updated
      expect(nextModel.isInternal).toBe(false)
      expect(nextModel.route).toEqual({ _tag: 'Home' })
      expect(cmd).toEqual(Cmd.none())
    })

    it('UrlChange navigates to new route when isInternal is false (browser back/forward)', () => {
      const config = createConfig()
      const context: TestContext = {
        isLoggedIn: true,
        currentUser: 'Rinne',
        isAdmin: false,
      }
      const initialModel: Model<TestRoute, TestPageModel> = {
        route: { _tag: 'Home' },
        pageModel: {
          activeTab: 'Home',
          fetchCount: 1,
          loadedData: 'initial',
        },
        isInternal: false,
      }

      const location = {
        pathname: '/login',
        href: 'http://localhost/login',
        search: '',
      } as Location

      const [nextModel] = urlChangeHandler(config, context)(location)(
        initialModel,
      )

      expect(nextModel.route).toEqual({ _tag: 'Login' })
      expect(nextModel.pageModel.fetchCount).toBe(2)
    })
  })

  describe('update reducer message dispatcher', () => {
    it('dispatches ChangeRoute, ModifyRoute, and Refresh via TEA update reducer', () => {
      const config = createConfig()
      const context: TestContext = {
        isLoggedIn: true,
        currentUser: 'Rinne',
        isAdmin: false,
      }
      const initialModel: Model<TestRoute, TestPageModel> = {
        route: { _tag: 'Home' },
        pageModel: {
          activeTab: 'Home',
          fetchCount: 1,
          loadedData: 'initial',
        },
        isInternal: false,
      }

      // NoOp
      const [noOpModel] = update(config, context)(
        { _tag: 'NoOp' },
        initialModel,
      )
      expect(noOpModel).toEqual(initialModel)

      // ChangeRoute
      const [changeRouteModel] = update(config, context)(
        { _tag: 'ChangeRoute', route: { _tag: 'Settings' } },
        initialModel,
      )
      expect(changeRouteModel.route).toEqual({ _tag: 'Settings' })

      // Refresh
      const [refreshedModel] = update(config, context)(
        { _tag: 'Refresh' },
        initialModel,
      )
      expect(refreshedModel.pageModel.fetchCount).toBe(2)
    })
  })

  describe('helper accessors and setters', () => {
    it('getRoute, getPageModel, setPageModel, getTargetRoute work correctly', () => {
      const config = createConfig()
      const model: Model<TestRoute, TestPageModel> = {
        route: { _tag: 'Home' },
        pageModel: {
          activeTab: 'Home',
          fetchCount: 1,
          loadedData: 'initial',
        },
        isInternal: false,
      }

      expect(getRoute(model)).toEqual({ _tag: 'Home' })
      expect(getPageModel(model)).toEqual(model.pageModel)

      const updated = setPageModel(model, {
        activeTab: 'custom',
        fetchCount: 5,
        loadedData: 'updated',
      })
      expect(getPageModel(updated).activeTab).toBe('custom')
      expect(getPageModel(updated).fetchCount).toBe(5)

      // getTargetRoute
      const target1 = getTargetRoute(config)(
        { _tag: 'ChangeRoute', route: { _tag: 'Settings' } },
        model.route,
      )
      expect(target1).toEqual({ _tag: 'Settings' })

      const target2 = getTargetRoute(config)(
        { _tag: 'ModifyRoute', func: () => ({ _tag: 'Login' }) },
        model.route,
      )
      expect(target2).toEqual({ _tag: 'Login' })

      const target3 = getTargetRoute(config)({ _tag: 'Refresh' }, model.route)
      expect(target3).toEqual({ _tag: 'Home' })
    })
  })
})
