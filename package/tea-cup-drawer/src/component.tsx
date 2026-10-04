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
import { cn } from '@rinn7e/tea-cup-prelude'
import {
  type ReactElement,
  type ReactNode,
  memo,
  useEffect,
  useRef,
} from 'react'
import { createPortal } from 'react-dom'
import { type Dispatcher } from 'tea-cup-fp'

import './drawer.css'
import { releaseOnUnmount } from './effect'
import { type Msg, type Portal, type Props, getPropsEq } from './type'
import { isModal } from './util'
import {
  contentAttrs,
  defaultContentView,
  defaultOverlayView,
  overlayAttrs,
} from './view'

const renderInPortal = (portal: Portal, node: ReactNode): ReactNode => {
  switch (portal._tag) {
    case 'Body':
      return createPortal(node, document.body)
    case 'Inline':
      return node
    case 'Container': {
      const container = portal.get()
      if (container === null) {
        return null
      } else {
        return createPortal(node, container)
      }
    }
  }
}

export const DrawerComponent = <Item, ItemMsg, Parent>({
  model,
  dispatch,
  renderContent,
  parent,
  className,
  overlayClassName,
}: Props<Item, ItemMsg, Parent>) => {
  // Unmounted before the drawer finished closing: closing's effects never
  // ran, so release what opening took. The release waits a microtask: React's
  // StrictMode runs the cleanup and the effect again right away on mount,
  // which is not an unmount.
  const latest = useRef(model)
  latest.current = model
  const isMounted = useRef(false)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      queueMicrotask(() => {
        if (!isMounted.current && latest.current.animate._tag !== 'Invisible') {
          releaseOnUnmount(latest.current.config)
        } else {
          // Mounted again (StrictMode), or closed normally
        }
      })
    }
  }, [])

  const animate = model.animate
  const config = model.config
  if (animate._tag === 'Invisible') {
    return null
  } else {
    const contentView = config.ui?.content ?? defaultContentView(className)
    const overlayView =
      config.ui?.overlay ?? defaultOverlayView(overlayClassName)
    return renderInPortal(
      config.portal,
      <>
        {isModal(config) &&
          overlayView({ attrs: overlayAttrs(model, dispatch) })}
        {contentView({
          attrs: contentAttrs(model, dispatch),
          direction: config.direction,
          children: renderContent(
            animate.internal,
            // Bound to this payload: once it is replaced or closed, its
            // messages no longer match
            (msg) =>
              dispatch({
                _tag: 'ContentMsg',
                key: config.uniqueKeyField(animate.internal),
                msg,
              }),
            parent,
          ),
        })}
      </>,
    )
  }
}

// Re-renders only when the model (`itemEq`) or `parent` (`parentEq`) change.
// Sound because `renderContent` receives everything it renders from as
// arguments.
export const DrawerMemo = memo(DrawerComponent, (prev, next) =>
  getPropsEq(prev.itemEq, prev.parentEq).equals(prev, next),
) as <Item, ItemMsg, Parent>(
  props: Props<Item, ItemMsg, Parent>,
) => ReactElement | null

export type HandleProps<Item> = {
  dispatch: Dispatcher<Msg<Item>>
  className?: string
}

// Drag handle. A tap cycles through the snap points (closing from the last
// one when dismissible); with `handleOnly`, only the handle starts a drag.
// Not memoized: it is a tiny leaf that only holds `dispatch`.
export const DrawerHandle = <Item,>({
  dispatch,
  className,
}: HandleProps<Item>) => (
  <div
    data-drawer-handle=''
    aria-hidden='true'
    onClick={() => dispatch({ _tag: 'CycleSnap' })}
    className={cn(
      'mx-auto my-3 h-[5px] w-9 shrink-0 cursor-grab rounded-full bg-gray-300 opacity-70 hover:opacity-100',
      className,
    )}
  >
    <span data-drawer-handle-hitarea='' />
  </div>
)

// Re-exported so a `ui` override can start from the default look
export { defaultContentView, defaultOverlayView } from './view'
