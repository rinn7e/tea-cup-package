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
import * as O from 'fp-ts/lib/Option'
import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import './drawer.css'
import { followKeyboard, holdBodyLock, releaseDrawer } from './effect'
import { type Msg, type Portal, type Props, getPropsEq } from './type'
import {
  contentDomId,
  dragDistance,
  draggedDistance,
  isModal,
  overlayDomId,
  overlayOpacityAt,
} from './util'
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
  // The body scroll lock is held by this view while it shows the drawer
  // (under the view's own id, see `effect.ts`), whatever closes it: a normal
  // close, an owner replacing the model with a closed one, or the view being
  // removed mid-way. The saved focus is given back with it.
  const viewId = useId()
  const isShown = model.animate._tag !== 'Invisible'
  const latest = useRef(model)
  latest.current = model
  const wasShown = useRef(false)
  useEffect(() => {
    if (isShown) {
      holdBodyLock(viewId, latest.current.config)
    } else if (wasShown.current) {
      releaseDrawer(viewId, latest.current.config)
    } else {
      // Never shown here: nothing to release
    }
    wasShown.current = isShown
  }, [isShown, viewId])

  // Unmounted while shown. The release waits a microtask: React's StrictMode
  // runs the cleanup and the effect again right away on mount, which is not
  // an unmount.
  const isMounted = useRef(false)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      queueMicrotask(() => {
        if (!isMounted.current && latest.current.animate._tag !== 'Invisible') {
          releaseDrawer(viewId, latest.current.config)
        } else {
          // Mounted again (StrictMode), or closed normally
        }
      })
    }
  }, [viewId])

  // Lift the drawer above the on-screen keyboard while it is shown
  useEffect(() => {
    if (isShown) {
      return followKeyboard(latest.current.config)
    } else {
      return undefined
    }
  }, [isShown])

  // While dragging, the view follows the pointer itself: each move sets the
  // drawer's position (and its overlay's opacity) on the elements, without a
  // message, so a move costs no `update` and no render of the owner's app.
  // The model keeps where the drag started; `decideRelease` only needs the
  // press and the release. The release (`pointerup`) is a subscription, heard
  // from the drag's first moment; `pointercancel` / `contextmenu` carry no
  // position, so the view releases them where the pointer was last seen,
  // like vaul. A layout effect: attached right after the commit that starts
  // the drag, before the next paint.
  const live = useRef<{ x: number; y: number; distance: number } | null>(null)
  const isDragging = model.animate._tag === 'Dragging'
  useLayoutEffect(() => {
    const start = latest.current
    if (start.animate._tag !== 'Dragging') {
      live.current = null
      return undefined
    } else {
      const { press, last } = start.animate
      live.current = { ...last, distance: start.animate.distance }
      const onMove = (e: PointerEvent) => {
        if (e.isPrimary) {
          const { config, snap } = latest.current
          const distance = dragDistance(
            config,
            snap,
            press,
            draggedDistance(config.direction, press, e.pageX, e.pageY),
          )
          live.current = { x: e.pageX, y: e.pageY, distance }
          document
            .getElementById(contentDomId(config.id))
            ?.style.setProperty('--drawer-translate', `${distance}px`)
          document
            .getElementById(overlayDomId(config.id))
            ?.style.setProperty(
              '--drawer-overlay-opacity',
              `${overlayOpacityAt(snap, press.size, distance)}`,
            )
        } else {
          // Another finger
        }
      }
      const onCancel = (e: Event) => {
        if (!(e instanceof PointerEvent) || e.isPrimary) {
          const at = live.current ?? last
          dispatch({ _tag: 'PointerUp', x: at.x, y: at.y, time: e.timeStamp })
        } else {
          // Another finger
        }
      }
      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointercancel', onCancel)
      document.addEventListener('contextmenu', onCancel)
      return () => {
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointercancel', onCancel)
        document.removeEventListener('contextmenu', onCancel)
      }
    }
  }, [isDragging, dispatch])

  // Portals render only once this view is mounted (as Radix's, which vaul
  // used), so the drawer is added after anything its owner adds to the same
  // container in that commit: React adds a nested portal's nodes first, and
  // an owner portaled to the body too (e.g. a mobile page) would otherwise
  // cover a drawer without a z-index. The layout effect re-renders before
  // the browser paints.
  const [isPortalReady, setIsPortalReady] = useState(false)
  useLayoutEffect(() => {
    setIsPortalReady(true)
  }, [])

  const animate = model.animate
  const config = model.config
  if (
    animate._tag === 'Invisible' ||
    (!isPortalReady && config.portal._tag !== 'Inline')
  ) {
    return null
  } else {
    const contentView = config.ui?.content ?? defaultContentView
    const overlayView = config.ui?.overlay ?? defaultOverlayView
    // A render in the middle of a drag (the owner re-rendered for another
    // reason) keeps the position the pointer moved it to, not the model's
    // (where the drag started)
    const dragged =
      animate._tag === 'Dragging' && live.current !== null
        ? O.some(live.current.distance)
        : O.none
    const contentAttrsNow = contentAttrs(model, dispatch)
    const overlayAttrsNow = overlayAttrs(model, dispatch)
    const withDragged = <A extends { style: CSSProperties }>(
      attrs: A,
      style: (distance: number) => CSSProperties,
    ): A =>
      O.isSome(dragged)
        ? { ...attrs, style: { ...attrs.style, ...style(dragged.value) } }
        : attrs
    return renderInPortal(
      config.portal,
      <>
        {isModal(config) &&
          overlayView({
            attrs: withDragged(overlayAttrsNow, (distance) =>
              animate._tag === 'Dragging'
                ? ({
                    '--drawer-overlay-opacity': `${overlayOpacityAt(model.snap, animate.press.size, distance)}`,
                  } as CSSProperties)
                : {},
            ),
            className: overlayClassName,
          })}
        {contentView({
          attrs: withDragged(
            contentAttrsNow,
            (distance) =>
              ({ '--drawer-translate': `${distance}px` }) as CSSProperties,
          ),
          direction: config.direction,
          className,
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

const DrawerInner = memo(DrawerComponent, (prev, next) =>
  getPropsEq(prev.itemEq, prev.parentEq).equals(prev, next),
) as <Item, ItemMsg, Parent>(
  props: Props<Item, ItemMsg, Parent>,
) => ReactElement | null

// Re-renders only when the model (`itemEq`) or `parent` (`parentEq`) change.
// Sound because `renderContent` receives everything it renders from as
// arguments. `dispatch` isn't compared but always reaches the latest one: an
// owner may pass a closure over its current data (e.g. a pick running an
// action), which the content of a skipped render would otherwise keep.
export const DrawerMemo = <Item, ItemMsg, Parent>(
  props: Props<Item, ItemMsg, Parent>,
): ReactElement | null => {
  const latestDispatch = useRef(props.dispatch)
  latestDispatch.current = props.dispatch
  const dispatch = useCallback(
    (msg: Msg<Item, ItemMsg>) => latestDispatch.current(msg),
    [],
  )
  return <DrawerInner {...props} dispatch={dispatch} />
}

// Re-exported so a `ui` override can start from the default look
export {
  defaultContentView,
  defaultHandleView,
  defaultOverlayView,
  drawerHandleView,
} from './view'
