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
 * @module @rinn7e/tea-cup-router/type
 *
 * Core type definitions for the TEA-Cup Router.
 * Provides type-safe models, configuration, route guards, and messages.
 */
import type * as EqClass from 'fp-ts/lib/Eq'
import * as Eq from 'fp-ts/lib/Eq'
import * as B from 'fp-ts/lib/boolean'
import type { Cmd } from 'tea-cup-fp'

/**
 * Result of evaluating a RouteGuard.
 * - `Allow`: Navigation to the target route is permitted.
 * - `Redirect`: Redirect navigation to another route (e.g. login page).
 * - `Reject`: Cancel navigation and remain on the current route.
 */
export type GuardResult<Route> =
  | { readonly _tag: 'Allow' }
  | { readonly _tag: 'Redirect'; readonly to: Route }
  | { readonly _tag: 'Reject' }

/**
 * Route guard function to enforce access control policies (e.g. authentication, roles).
 *
 * @param toRoute - Target route being navigated to.
 * @param context - Shared application context (e.g. current user, auth tokens).
 * @param isInternal - Whether navigation was triggered internally (code/link) or externally (browser URL bar/popstate).
 */
export type RouteGuard<Route, Context> = (
  toRoute: Route,
  context: Context,
  isInternal: boolean,
) => GuardResult<Route>

/**
 * Configuration options for the TEA Navigation router.
 *
 * @template Route - Application route sum-type.
 * @template PageModel - Application page model sum-type.
 * @template Context - Shared contextual data (e.g. authentication state).
 * @template PageMsg - Application message type (defaults to `Msg<Route>`).
 */
export type Config<Route, PageModel, Context, PageMsg = Msg<Route>> = {
  /**
   * Parses the browser's `Location` object into a typed `Route`.
   */
  readonly parseUrl: (location: Location) => Route

  /**
   * Serializes a typed `Route` into a URL path/hash string.
   */
  readonly toUrl: (route: Route) => string

  /**
   * Eq instance to compare equality between two `Route` instances.
   */
  readonly routeEq: EqClass.Eq<Route>

  /**
   * Optional route guard to check authorization before executing route transitions.
   */
  readonly guard?: RouteGuard<Route, Context>

  /**
   * Initializes or re-initializes the page model when transitioning to a new route.
   *
   * @param route - The new active route.
   * @param context - The shared application context.
   * @param prev - Previous route and page model, allowing conditional re-initialization or state reuse.
   * @returns A tuple of `[newPageModel, pageCmd]`.
   */
  readonly initPageModel: (
    route: Route,
    context: Context,
    prev?: {
      readonly route: Route
      readonly pageModel: PageModel
    },
  ) => [PageModel, Cmd<PageMsg>]

  /**
   * Optional message constructor to wrap router commands into application-level messages.
   */
  readonly toMsg?: (routerMsg: Msg<Route>) => PageMsg
}

/**
 * Router Model state.
 *
 * @template Route - Application route sum-type.
 * @template PageModel - Application page model sum-type.
 */
export type Model<Route, PageModel> = {
  /** The current active route. */
  readonly route: Route

  /** The current active page model. */
  readonly pageModel: PageModel

  /**
   * Flag indicating if the navigation was initiated internally (via `ChangeRoute`),
   * used to suppress redundant popstate loop executions from browser URL bar updates.
   */
  readonly isInternal: boolean
}

/**
 * Creates an `Eq` instance for `Model<Route, PageModel>` to support React memoization.
 *
 * @param routeEq - Eq instance for the route.
 * @param pageModelEq - Eq instance for the page model.
 */
export const mkModelEq = <Route, PageModel>(
  routeEq: EqClass.Eq<Route>,
  pageModelEq: EqClass.Eq<PageModel>,
): EqClass.Eq<Model<Route, PageModel>> =>
  Eq.struct<Model<Route, PageModel>>({
    route: routeEq,
    pageModel: pageModelEq,
    isInternal: B.Eq,
  })

/**
 * Unexported unique symbol used to enforce nominal branding across Navigation messages.
 *
 * Why this is needed:
 * 1. TypeScript uses structural typing by default, which allows consumers to instantiate raw object
 *    literals (e.g. `{ _tag: 'ChangeRoute', route }`) directly rather than using constructor functions.
 * 2. By requiring an unexported symbol property `[_msgBrand]: true`, external callers are strictly
 *    forbidden from constructing raw literals and are forced to use the explicit constructor helpers
 *    (`urlChangeMsg`, `changeRouteMsg`, etc.).
 * 3. Pattern matching (e.g. `switch (msg._tag)`) remains 100% unaffected and type-safe.
 * 4. As a compile-time-only `declare const`, it is completely erased during compilation with zero runtime cost.
 */
declare const _msgBrand: unique symbol

/**
 * Triggered on browser URL changes (e.g. popstate, back/forward button).
 */
export type UrlChangeMsg = {
  readonly _tag: 'UrlChange'
  readonly location: Location
  readonly [_msgBrand]: true
}

export const UrlChangeMsg = (location: Location): UrlChangeMsg =>
  ({
    _tag: 'UrlChange',
    location,
  }) as UrlChangeMsg

/**
 * Triggers full navigation to a route (evaluating guards and initializing page model).
 */
export type ChangeRouteMsg<Route> = {
  readonly _tag: 'ChangeRoute'
  readonly route: Route
  readonly [_msgBrand]: true
}

export const ChangeRouteMsg = <Route>(route: Route): ChangeRouteMsg<Route> =>
  ({
    _tag: 'ChangeRoute',
    route,
  }) as ChangeRouteMsg<Route>

/**
 * Updates the route and URL in browser address bar without re-initializing the page model.
 */
export type ChangeRouteNoReloadMsg<Route> = {
  readonly _tag: 'ChangeRouteNoReload'
  readonly route: Route
  readonly [_msgBrand]: true
}

export const ChangeRouteNoReloadMsg = <Route>(
  route: Route,
): ChangeRouteNoReloadMsg<Route> =>
  ({
    _tag: 'ChangeRouteNoReload',
    route,
  }) as ChangeRouteNoReloadMsg<Route>

/**
 * Updates the URL in browser address bar only without modifying active route or page model.
 */
export type ChangeRouteUrlNoReloadMsg<Route> = {
  readonly _tag: 'ChangeRouteUrlNoReload'
  readonly route: Route
  readonly [_msgBrand]: true
}

export const ChangeRouteUrlNoReloadMsg = <Route>(
  route: Route,
): ChangeRouteUrlNoReloadMsg<Route> =>
  ({
    _tag: 'ChangeRouteUrlNoReload',
    route,
  }) as ChangeRouteUrlNoReloadMsg<Route>

/**
 * Router messages for the TEA architecture.
 */
export type Msg<Route> =
  | UrlChangeMsg
  | ChangeRouteMsg<Route>
  | ChangeRouteNoReloadMsg<Route>
  | ChangeRouteUrlNoReloadMsg<Route>
  | {
      readonly _tag: 'NoOp'
    }
