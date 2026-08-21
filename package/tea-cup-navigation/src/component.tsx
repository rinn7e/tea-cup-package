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
 * @module @rinn7e/tea-cup-navigation/component
 *
 * Declarative React Link components for TEA applications.
 * Handles client-side navigation while supporting native browser features
 * (e.g. middle-click, command-click, right-click context menu).
 */
import React, { memo } from 'react'

import { type Props, mkPropsEq } from './type'

/**
 * Unmemoized Link anchor component.
 * Intercepts standard left-clicks without modifier keys and dispatches `{ _tag: 'ChangeRoute', route }`.
 */
export const LinkComponent = <Route,>({
  route,
  toUrl,
  dispatch,
  routeEq: _routeEq,
  className,
  children,
  onClick,
  ...rest
}: Props<Route>) => {
  const href = toUrl(route)

  return (
    <a
      {...rest}
      href={href}
      className={className}
      onClick={(e) => {
        if (onClick) onClick(e)
        if (
          !e.defaultPrevented &&
          e.button === 0 &&
          !e.metaKey &&
          !e.ctrlKey &&
          !e.shiftKey
        ) {
          e.preventDefault()
          dispatch({ _tag: 'ChangeRoute', route })
        }
      }}
    >
      {children}
    </a>
  )
}

/**
 * Memoized Link component optimized with `mkPropsEq`.
 * Callers should import qualified: `import { Link as NavLink } from '@rinn7e/tea-cup-navigation/component'`.
 */
export const Link = memo(LinkComponent, (prev, next) => {
  const propEq = mkPropsEq(prev.routeEq)
  return propEq.equals(prev, next)
}) as <Route>(props: Props<Route>) => React.ReactElement
