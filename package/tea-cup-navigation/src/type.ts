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
 * @module @rinn7e/tea-cup-navigation/type
 *
 * Core type definitions for the TEA-Cup Navigation router.
 * Provides type-safe models, configuration, route guards, and messages.
 */
import type * as EqClass from 'fp-ts/lib/Eq'
import * as Eq from 'fp-ts/lib/Eq'
import * as B from 'fp-ts/lib/boolean'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import type { Cmd, Dispatcher } from 'tea-cup-fp'

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
  readonly toMsg?: (navMsg: Msg<Route>) => PageMsg
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
 * Router messages for the TEA architecture.
 */
export type Msg<Route> =
  /** Triggered on browser URL changes (e.g. popstate, back/forward button). */
  | { readonly _tag: 'UrlChange'; readonly location: Location }

  /** Triggers full navigation to a route (evaluating guards and initializing page model). */
  | { readonly _tag: 'ChangeRoute'; readonly route: Route }

  /** Updates the route and URL in browser address bar without re-initializing the page model. */
  | { readonly _tag: 'ChangeRouteNoReload'; readonly route: Route }

  /** Updates the URL in browser address bar only without modifying active route or page model. */
  | { readonly _tag: 'ChangeRouteUrlNoReload'; readonly route: Route }

  /** No-operation message. */
  | { readonly _tag: 'NoOp' }

/**
 * Props for the `Link` navigation component.
 */
export type Props<Route> = AnchorHTMLAttributes<HTMLAnchorElement> & {
  /** Target route to navigate to. */
  readonly route: Route

  /** Converts the route to an href string. */
  readonly toUrl: (route: Route) => string

  /** Dispatcher function to send TEA messages. */
  readonly dispatch: Dispatcher<Msg<Route>>

  /** Optional route equality comparator for memoization. */
  readonly routeEq?: EqClass.Eq<Route>

  /** Link contents. */
  readonly children: ReactNode
}

/**
 * Creates an `Eq` instance for `Props<Route>` to optimize React component memoization.
 *
 * @param routeEq - Optional route Eq comparator.
 */
export const mkPropsEq = <Route>(
  routeEq?: EqClass.Eq<Route>,
): EqClass.Eq<Props<Route>> => ({
  equals: (a, b) => {
    if (
      a.href !== b.href ||
      a.className !== b.className ||
      a.children !== b.children ||
      a.target !== b.target ||
      a.rel !== b.rel ||
      a.title !== b.title
    ) {
      return false
    }
    if (routeEq) {
      return routeEq.equals(a.route, b.route)
    }
    return a.route === b.route
  },
})
