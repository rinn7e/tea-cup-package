/* MIT License

Copyright (c) 2025 Moremi Vannak

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
/**
 * @module @rinn7e/tea-cup-router/update
 *
 * Core update functions and message handlers for the TEA router.
 * Supports both pure TEA message dispatching and direct handler function invocations.
 */
import { newUrl } from 'react-tea-cup'
import { Cmd, Task } from 'tea-cup-fp'

import { type Config, type Model, type Msg } from './type'

/**
 * Creates a command to update the browser address bar URL via `react-tea-cup`'s `newUrl`.
 *
 * @param url - The new URL string to push to browser history.
 */
export const changeUrlCmd = <Route = never>(url: string): Cmd<Msg<Route>> =>
  Task.perform(newUrl(url), (): Msg<Route> => ({ _tag: 'NoOp' }))

/**
 * Retrieves the current active page model from the navigation model.
 *
 * @param model - Navigation model.
 * @returns The current active page model.
 */
export const getPageModel = <Route, PageModel>(
  model: Model<Route, PageModel>,
): PageModel => model.pageModel

/**
 * Retrieves the current active route from the navigation model.
 *
 * @param model - Navigation model.
 * @returns The current active route.
 */
export const getRoute = <Route, PageModel>(
  model: Model<Route, PageModel>,
): Route => model.route

/**
 * Replaces the page model within the navigation model.
 *
 * @param model - Navigation model.
 * @param pageModel - The new page model.
 * @returns Updated navigation model.
 */
export const setPageModel = <Route, PageModel>(
  model: Model<Route, PageModel>,
  pageModel: PageModel,
): Model<Route, PageModel> => ({
  ...model,
  pageModel,
})

/**
 * Resolves the target route that a router message would navigate to, if applicable.
 * Useful for intercepting navigation, evaluating pre-navigation guards, or running side effects before dispatching.
 *
 * @param config - Router configuration providing `parseUrl`.
 * @returns Curried function: `(msg, currentRoute) => targetRoute | null`.
 */
export const getTargetRoute =
  <Route>(config: { readonly parseUrl: (location: Location) => Route }) =>
  (msg: Msg<Route>, currentRoute: Route): Route | null => {
    switch (msg._tag) {
      case 'ChangeRoute':
      case 'ChangeRouteNoReload':
      case 'ChangeRouteUrlNoReload':
        return msg.route
      case 'ModifyRoute':
      case 'ModifyRouteNoReload':
      case 'ModifyRouteUrlNoReload':
        return msg.func(currentRoute)
      case 'UrlChange':
        return config.parseUrl(msg.location)
      case 'Refresh':
        return currentRoute
      case 'NoOp':
        return null
    }
  }

/**
 * Direct message handler for full route changes (`ChangeRoute`).
 * Evaluates route guards, initializes the new page model, updates the browser URL,
 * and sets `isInternal: true` to suppress popstate re-entry.
 *
 * @param config - Router configuration.
 * @param context - Shared application context.
 * @returns Curried handler function: `(route, isInternal?) => (model) => [Model, Cmd]`.
 */
export const changeRouteHandler =
  <Route, PageModel, Context, PageMsg = Msg<Route>>(
    config: Config<Route, PageModel, Context, PageMsg>,
    context: Context,
  ) =>
  (route: Route, forceRefresh: boolean = false, isInternal: boolean = true) =>
  (model: Model<Route, PageModel>): [Model<Route, PageModel>, Cmd<PageMsg>] => {
    return navigateTo(config, context)(
      route,
      isInternal,
      model,
      undefined,
      forceRefresh,
    )
  }

/**
 * Direct message handler for URL changes without page model re-initialization (`ChangeRouteNoReload`).
 * Ideal for pagination, tab switching, and query parameter changes where page state should persist.
 *
 * @param config - Router configuration.
 * @returns Curried handler function: `(route) => (model) => [Model, Cmd]`.
 */
export const changeRouteNoReloadHandler =
  <Route, PageModel, Context, PageMsg = Msg<Route>>(
    config: Config<Route, PageModel, Context, PageMsg>,
  ) =>
  (route: Route) =>
  (model: Model<Route, PageModel>): [Model<Route, PageModel>, Cmd<PageMsg>] => {
    const url = config.toUrl(route)
    const urlCmd = changeUrlCmd<Route>(url).map(config.toMsg)

    return [
      {
        ...model,
        route,
        isInternal: true,
      },
      urlCmd,
    ]
  }

/**
 * Direct message handler to modify the browser address bar URL only (`ChangeRouteUrlNoReload`),
 * without changing the active route or page model.
 *
 * @param config - Router configuration.
 * @returns Curried handler function: `(route) => (model) => [Model, Cmd]`.
 */
export const changeRouteUrlNoReloadHandler =
  <Route, PageModel, Context, PageMsg = Msg<Route>>(
    config: Config<Route, PageModel, Context, PageMsg>,
  ) =>
  (route: Route) =>
  (model: Model<Route, PageModel>): [Model<Route, PageModel>, Cmd<PageMsg>] => {
    const url = config.toUrl(route)
    const urlCmd = changeUrlCmd<Route>(url).map(config.toMsg)

    return [
      {
        ...model,
        isInternal: true,
      },
      urlCmd,
    ]
  }

/**
 * Direct message handler to transform the current route (`ModifyRoute`).
 *
 * @param config - Router configuration.
 * @param context - Shared application context.
 * @returns Curried handler function: `(func, forceRefresh?, isInternal?) => (model) => [Model, Cmd]`.
 */
export const modifyRouteHandler =
  <Route, PageModel, Context, PageMsg = Msg<Route>>(
    config: Config<Route, PageModel, Context, PageMsg>,
    context: Context,
  ) =>
  (
    func: (currentRoute: Route) => Route,
    forceRefresh: boolean = false,
    isInternal: boolean = true,
  ) =>
  (model: Model<Route, PageModel>): [Model<Route, PageModel>, Cmd<PageMsg>] => {
    const newRoute = func(model.route)
    return changeRouteHandler(config, context)(
      newRoute,
      forceRefresh,
      isInternal,
    )(model)
  }

/**
 * Direct message handler to transform the current route without re-initializing the page model (`ModifyRouteNoReload`).
 *
 * @param config - Router configuration.
 * @returns Curried handler function: `(func) => (model) => [Model, Cmd]`.
 */
export const modifyRouteNoReloadHandler =
  <Route, PageModel, Context, PageMsg = Msg<Route>>(
    config: Config<Route, PageModel, Context, PageMsg>,
  ) =>
  (func: (currentRoute: Route) => Route) =>
  (model: Model<Route, PageModel>): [Model<Route, PageModel>, Cmd<PageMsg>] => {
    const newRoute = func(model.route)
    return changeRouteNoReloadHandler(config)(newRoute)(model)
  }

/**
 * Direct message handler to transform the browser address bar URL only (`ModifyRouteUrlNoReload`),
 * without changing the active route or page model.
 *
 * @param config - Router configuration.
 * @returns Curried handler function: `(func) => (model) => [Model, Cmd]`.
 */
export const modifyRouteUrlNoReloadHandler =
  <Route, PageModel, Context, PageMsg = Msg<Route>>(
    config: Config<Route, PageModel, Context, PageMsg>,
  ) =>
  (func: (currentRoute: Route) => Route) =>
  (model: Model<Route, PageModel>): [Model<Route, PageModel>, Cmd<PageMsg>] => {
    const newRoute = func(model.route)
    return changeRouteUrlNoReloadHandler(config)(newRoute)(model)
  }

/**
 * Direct message handler to refresh the current route with forceRefresh enabled (`Refresh`).
 *
 * @param config - Router configuration.
 * @param context - Shared application context.
 * @returns Curried handler function: `(model) => [Model, Cmd]`.
 */
export const refreshHandler =
  <Route, PageModel, Context, PageMsg = Msg<Route>>(
    config: Config<Route, PageModel, Context, PageMsg>,
    context: Context,
  ) =>
  (model: Model<Route, PageModel>): [Model<Route, PageModel>, Cmd<PageMsg>] => {
    return changeRouteHandler(config, context)(model.route, true, true)(model)
  }

/**
 * Direct message handler for browser location change events (`UrlChange`).
 * If the change was triggered internally, resets `isInternal` and skips re-navigation;
 * otherwise parses the URL and navigates to the target route.
 *
 * @param config - Router configuration.
 * @param context - Shared application context.
 * @returns Curried handler function: `(location) => (model) => [Model, Cmd]`.
 */
export const urlChangeHandler =
  <Route, PageModel, Context, PageMsg = Msg<Route>>(
    config: Config<Route, PageModel, Context, PageMsg>,
    context: Context,
  ) =>
  (location: Location) =>
  (model: Model<Route, PageModel>): [Model<Route, PageModel>, Cmd<PageMsg>] => {
    if (model.isInternal) {
      return [
        {
          ...model,
          isInternal: false,
        },
        Cmd.none(),
      ]
    }
    const route = config.parseUrl(location)
    return navigateTo(config, context)(route, false, model)
  }

/**
 * Resolves any redirects from the route guard for a given route.
 *
 * @param config - Router configuration.
 * @param route - Target route to check.
 * @param context - Shared context.
 * @param isInternal - Whether this navigation is internal.
 * @returns The final guarded route.
 */
export const resolveGuard = <Route, PageModel, Context, PageMsg = Msg<Route>>(
  config: Config<Route, PageModel, Context, PageMsg>,
  route: Route,
  context: Context,
  isInternal: boolean = false,
): Route => {
  if (!config.guard) {
    return route
  }
  const guardRes = config.guard(route, context, isInternal)
  if (guardRes._tag === 'Redirect') {
    return resolveGuard(config, guardRes.to, context, true)
  }
  return route
}

/**
 * Initializes the navigation model and initial page model from the initial browser `Location`.
 *
 * @param config - Router configuration.
 * @param location - Current browser location.
 * @param context - Shared application context.
 * @returns Initial router state and command tuple `[Model, Cmd]`.
 */
export const init = <Route, PageModel, Context, PageMsg = Msg<Route>>(
  config: Config<Route, PageModel, Context, PageMsg>,
  location: Location,
  context: Context,
): [Model<Route, PageModel>, Cmd<PageMsg>] => {
  const parsedRoute = config.parseUrl(location)
  const guardedRoute = resolveGuard(config, parsedRoute, context, false)
  const [initialPageModel, initialPageCmd] = config.initPageModel(
    guardedRoute,
    context,
  )
  const isRedirected = !config.routeEq.equals(parsedRoute, guardedRoute)
  const urlCmd = isRedirected
    ? changeUrlCmd<Route>(config.toUrl(guardedRoute)).map(config.toMsg)
    : Cmd.none<PageMsg>()
  const initialModel: Model<Route, PageModel> = {
    route: guardedRoute,
    pageModel: initialPageModel,
    isInternal: false,
  }
  return [initialModel, Cmd.batch([urlCmd, initialPageCmd])]
}

/**
 * Standard TEA reducer function for the navigation router.
 * Dispatches messages to their corresponding handler functions.
 *
 * @param config - Router configuration.
 * @param context - Shared application context.
 * @returns Curried update function: `(msg, model) => [Model, Cmd]`.
 */
export const update =
  <Route, PageModel, Context, PageMsg = Msg<Route>>(
    config: Config<Route, PageModel, Context, PageMsg>,
    context: Context,
  ) =>
  (
    msg: Msg<Route>,
    model: Model<Route, PageModel>,
  ): [Model<Route, PageModel>, Cmd<PageMsg>] => {
    switch (msg._tag) {
      case 'NoOp':
        return [model, Cmd.none()]

      case 'UrlChange':
        return urlChangeHandler(config, context)(msg.location)(model)

      case 'ChangeRoute':
        return changeRouteHandler(config, context)(
          msg.route,
          msg.forceRefresh ?? false,
          true,
        )(model)

      case 'ChangeRouteNoReload':
        return changeRouteNoReloadHandler(config)(msg.route)(model)

      case 'ChangeRouteUrlNoReload':
        return changeRouteUrlNoReloadHandler(config)(msg.route)(model)

      case 'ModifyRoute':
        return modifyRouteHandler(config, context)(
          msg.func,
          msg.forceRefresh ?? false,
          true,
        )(model)

      case 'ModifyRouteNoReload':
        return modifyRouteNoReloadHandler(config)(msg.func)(model)

      case 'ModifyRouteUrlNoReload':
        return modifyRouteUrlNoReloadHandler(config)(msg.func)(model)

      case 'Refresh':
        return refreshHandler(config, context)(model)
    }
  }

/**
 * Internal navigation transition helper.
 * Evaluates route guards, equality checks, page model initialization, and URL commands.
 */
const navigateTo =
  <Route, PageModel, Context, PageMsg = Msg<Route>>(
    config: Config<Route, PageModel, Context, PageMsg>,
    context: Context,
  ) =>
  (
    targetRoute: Route,
    isInternal: boolean,
    model: Model<Route, PageModel>,
    existingPageCmd?: Cmd<PageMsg>,
    forceRefresh: boolean = false,
  ): [Model<Route, PageModel>, Cmd<PageMsg>] => {
    if (config.guard) {
      const guardRes = config.guard(targetRoute, context, isInternal)
      if (guardRes._tag === 'Redirect') {
        return navigateTo(config, context)(
          guardRes.to,
          true,
          model,
          undefined,
          forceRefresh,
        )
      }
      if (guardRes._tag === 'Reject') {
        return [model, Cmd.none()]
      }
    }

    const isSame = config.routeEq.equals(model.route, targetRoute)
    if (isSame && !isInternal && !existingPageCmd && !forceRefresh) {
      return [model, Cmd.none()]
    }

    const [pageModel, pageCmd] = existingPageCmd
      ? [model.pageModel, existingPageCmd]
      : config.initPageModel(
          targetRoute,
          context,
          {
            route: model.route,
            pageModel: model.pageModel,
          },
          forceRefresh,
        )

    const urlCmd = isInternal
      ? changeUrlCmd<Route>(config.toUrl(targetRoute)).map(config.toMsg)
      : Cmd.none<PageMsg>()

    return [
      {
        route: targetRoute,
        pageModel,
        isInternal,
      },
      Cmd.batch([urlCmd, pageCmd]),
    ]
  }
