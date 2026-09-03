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
 * @module @rinn7e/tea-cup-router/link/component
 *
 * Declarative React Link components for TEA applications.
 * Handles client-side navigation while supporting native browser features
 * (e.g. middle-click, command-click, right-click context menu).
 */
import React, { memo } from 'react'

import { type Props, mkPropsEq } from './type'

/**
 * Unmemoized Link anchor or button component.
 * Intercepts standard left-clicks without modifier keys and dispatches `{ _tag: 'ChangeRoute', route, forceRefresh }`.
 */
export const LinkComponent = <Route,>({
  route,
  toUrl,
  dispatch,
  routeEq: _routeEq,
  forceRefresh,
  className,
  children,
  onClick,
  isButton = false,
  ...rest
}: Props<Route>) => {
  const href = toUrl(route)

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (onClick) {
      ;(onClick as React.MouseEventHandler<HTMLElement>)(e)
    }
    if (
      !e.defaultPrevented &&
      e.button === 0 &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.shiftKey
    ) {
      e.preventDefault()
      dispatch({
        _tag: 'ChangeRoute',
        route,
        forceRefresh,
      })
    }
  }

  if (isButton) {
    const { type = 'button', ...buttonRest } =
      rest as React.ButtonHTMLAttributes<HTMLButtonElement>
    return (
      <button
        {...buttonRest}
        type={type}
        className={className}
        onClick={handleClick}
      >
        {children}
      </button>
    )
  }

  return (
    <a
      {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      href={href}
      className={className}
      onClick={handleClick}
    >
      {children}
    </a>
  )
}

/**
 * Memoized Link component optimized with `mkPropsEq`.
 * Callers should import: `import { Link } from '@rinn7e/tea-cup-router/link/component'`.
 */
export const Link = memo(LinkComponent, (prev, next) => {
  const propEq = mkPropsEq(prev.routeEq)
  return propEq.equals(prev, next)
}) as <Route>(props: Props<Route>) => React.ReactElement
