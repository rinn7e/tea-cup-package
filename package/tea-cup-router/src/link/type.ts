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
import type * as EqClass from 'fp-ts/lib/Eq'
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from 'react'
import type { Dispatcher } from 'tea-cup-fp'

import type { Msg } from '../type'

export type BaseProps<Route> = {
  /** Target route to navigate to. */
  readonly route: Route

  /** Converts the route to an href string. */
  readonly toUrl: (route: Route) => string

  /** Dispatcher function to send TEA messages. */
  readonly dispatch: Dispatcher<Msg<Route>>

  /** Optional route equality comparator for memoization. */
  readonly routeEq?: EqClass.Eq<Route>

  /** Optional flag to force re-initialization even if navigating to the current route. */
  readonly forceRefresh?: boolean

  /** Link contents. */
  readonly children: ReactNode
}

export type AnchorProps<Route> = BaseProps<Route> & {
  /** When true, renders as <button> instead of <a>. Defaults to false. */
  readonly isButton?: false
} & AnchorHTMLAttributes<HTMLAnchorElement>

export type ButtonProps<Route> = BaseProps<Route> & {
  /** When true, renders as <button> instead of <a>. Defaults to false. */
  readonly isButton: true
} & ButtonHTMLAttributes<HTMLButtonElement>

/**
 * Props for the `Link` navigation component.
 */
export type Props<Route> = AnchorProps<Route> | ButtonProps<Route>

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
      Boolean(a.isButton) !== Boolean(b.isButton) ||
      Boolean(a.forceRefresh) !== Boolean(b.forceRefresh) ||
      (a as AnchorHTMLAttributes<HTMLAnchorElement>).href !==
        (b as AnchorHTMLAttributes<HTMLAnchorElement>).href ||
      a.className !== b.className ||
      a.children !== b.children ||
      (a as AnchorHTMLAttributes<HTMLAnchorElement>).target !==
        (b as AnchorHTMLAttributes<HTMLAnchorElement>).target ||
      (a as AnchorHTMLAttributes<HTMLAnchorElement>).rel !==
        (b as AnchorHTMLAttributes<HTMLAnchorElement>).rel ||
      a.title !== b.title ||
      (a as ButtonHTMLAttributes<HTMLButtonElement>).disabled !==
        (b as ButtonHTMLAttributes<HTMLButtonElement>).disabled
    ) {
      return false
    }

    if (routeEq) {
      return routeEq.equals(a.route, b.route)
    }

    return a.route === b.route
  },
})
