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
SOFTWARE.

`getTranslate` and the scrollable-ancestor walk are ported from vaul
(https://github.com/emilkowalski/vaul), Copyright (c) 2023 Emil Kowalski,
MIT License. */
import { cn } from '@rinn7e/tea-cup-prelude'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import { type CSSProperties, type JSX, type PointerEvent } from 'react'
import { type Dispatcher } from 'tea-cup-fp'

import { hasSelection } from './subscription'
import {
  type Config,
  type ContentAttrs,
  type ContentUiArg,
  type Direction,
  type HandleAttrs,
  type HandleUiArg,
  type Model,
  type Msg,
  type OverlayAttrs,
  type OverlayUiArg,
  type Press,
} from './type'
import {
  type ScrollBox,
  contentDomId,
  directionMultiplier,
  hasSnapPoints,
  isModal,
  isVertical,
  overlayDomId,
  overlayOpacity,
  restDistancePx,
  scrollerTakesGesture,
  scrollerTakesOpening,
  scrollsAcross,
  takesPress,
  touchMoveDecision,
  translateCss,
} from './util'

// Measuring
// ---------------------------------

// Current translation of the element along the drawer axis, read from its
// computed transform (mid-transition values included).
const getTranslate = (element: HTMLElement, direction: Direction): number => {
  const transform = window.getComputedStyle(element).transform
  const matrix3d = transform.match(/^matrix3d\((.+)\)$/)
  const matrix = transform.match(/^matrix\((.+)\)$/)
  if (matrix3d) {
    // https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/matrix3d
    return parseFloat(matrix3d[1].split(', ')[isVertical(direction) ? 13 : 12])
  } else if (matrix) {
    // https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/matrix
    return parseFloat(matrix[1].split(', ')[isVertical(direction) ? 5 : 4])
  } else {
    return 0
  }
}

type ScrollerFlags = Pick<
  Press,
  'scrollerTakesGesture' | 'scrollerTakesOpening' | 'isInCrossScroller'
>

// Whether an element between `target` and the drawer (included) takes the
// gesture (`scrollerTakesGesture`), can still scroll the way an opening drag
// goes (`scrollerTakesOpening`), or scrolls across the axis (`scrollsAcross`)
const measureScrollers = (
  target: Element,
  content: HTMLElement,
  direction: Direction,
): ScrollerFlags => {
  const flags: ScrollerFlags = {
    scrollerTakesGesture: false,
    scrollerTakesOpening: false,
    isInCrossScroller: false,
  }
  let element: Element | null = target
  while (element !== null) {
    const style = window.getComputedStyle(element)
    const box: ScrollBox = {
      scrollTop: element.scrollTop,
      scrollHeight: element.scrollHeight,
      scrollWidth: element.scrollWidth,
      clientHeight: element.clientHeight,
      clientWidth: element.clientWidth,
      overflowX: style.overflowX,
      overflowY: style.overflowY,
    }
    flags.scrollerTakesGesture ||= scrollerTakesGesture(direction, box)
    flags.scrollerTakesOpening ||= scrollerTakesOpening(direction, box)
    flags.isInCrossScroller ||= scrollsAcross(direction, box)
    element = element === content ? null : element.parentElement
  }
  return flags
}

// When a scroller in each drawer's content last scrolled (`Event.timeStamp`):
// a list in momentum or bouncing past its edge fires `scroll` every frame
const lastContentScrollAt = new WeakMap<HTMLElement, number>()

const measurePress = <Item,>(
  model: Model<Item>,
  e: PointerEvent<HTMLElement>,
): O.Option<Press> => {
  const config = model.config
  const content = e.currentTarget
  const target = e.target instanceof Element ? e.target : content
  const isHandle = target.closest('[data-drawer-handle]') !== null
  if (e.button !== 0 || !e.isPrimary) {
    return O.none
  } else if (!content.contains(target)) {
    // From a portal rendered inside the content (e.g. a nested drawer): React
    // bubbles it here, but that drawer drags itself
    return O.none
  } else if (config.handleOnly && !isHandle) {
    return O.none
  } else {
    const rect = content.getBoundingClientRect()
    const vertical = isVertical(config.direction)
    const size = vertical ? rect.height : rect.width
    // At rest the position is known from the model; mid-transition it is
    // read from the element
    const startDistance =
      model.animate._tag === 'Visible'
        ? restDistancePx(model.snap, size)
        : getTranslate(content, config.direction) *
          directionMultiplier(config.direction)
    return O.some({
      pointerType: e.pointerType,
      startX: e.pageX,
      startY: e.pageY,
      startedAt: e.timeStamp,
      startDistance,
      size,
      viewport: vertical ? window.innerHeight : window.innerWidth,
      isNoDragTarget:
        target.tagName === 'SELECT' ||
        target.closest('[data-drawer-no-drag]') !== null,
      ...measureScrollers(target, content, config.direction),
      isContentScrolling: pipe(
        O.fromNullable(lastContentScrollAt.get(content)),
        O.exists((at) => e.timeStamp - at < config.scrollLockTimeout),
      ),
    })
  }
}

// Attributes
// ---------------------------------

// The press each drawer's content last took, with the model it was pressed
// in, for `willDrag`. `lastDragPreventedAt` follows the press as `update`'s
// does: a move left to the content locks out dragging for a while.
type PendingPress = {
  model: Model<unknown>
  press: Press
  lastDragPreventedAt: O.Option<number>
}
const pendingPresses = new WeakMap<HTMLElement, PendingPress>()

// `touchMoveDecision` for a touch move on the drawer's content
const willDrag = (element: HTMLElement, e: TouchEvent): boolean => {
  const pending = pendingPresses.get(element)
  const touch = e.touches.item(0)
  if (pending === undefined || touch === null) {
    return false
  } else {
    const decision = touchMoveDecision(
      { ...pending.model, lastDragPreventedAt: pending.lastDragPreventedAt },
      pending.press,
      { x: touch.pageX, y: touch.pageY, time: e.timeStamp },
      hasSelection(),
    )
    if (O.isSome(decision)) {
      pending.lastDragPreventedAt = decision.value.lastDragPreventedAt
      return decision.value.allow
    } else {
      pendingPresses.delete(element)
      return false
    }
  }
}

// A scroller inside the drawer starts its native pan on a drag from it: the
// drawer's `touch-action: none` doesn't reach past it. The pan then cancels
// the pointer (and on iOS flings the content while the drawer animates).
// Cancel the touch moves while the drawer follows the finger, and before:
// Android starts the pan on the first move past its touch slop, before the
// press reaches `dragThreshold`. React's `onTouchMove` is passive, so it is a
// DOM listener, attached once per element (a stable ref callback).
const preventScrollWhileDragging = (
  element: HTMLElement | null,
): (() => void) | undefined => {
  if (element === null) {
    return undefined
  } else {
    const onTouchMove = (e: TouchEvent) => {
      if (
        (element.dataset.state === 'Dragging' || willDrag(element, e)) &&
        e.cancelable
      ) {
        e.preventDefault()
      } else {
        // Not dragging: the content scrolls
      }
    }
    element.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => element.removeEventListener('touchmove', onTouchMove)
  }
}

// Records when a scroller in the content scrolled (`scroll` doesn't bubble:
// captured on the drawer), for `isContentScrolling`
const trackContentScroll = (
  element: HTMLElement | null,
): (() => void) | undefined => {
  if (element === null) {
    return undefined
  } else {
    const onScroll = (e: Event) => {
      lastContentScrollAt.set(element, e.timeStamp)
    }
    element.addEventListener('scroll', onScroll, {
      capture: true,
      passive: true,
    })
    return () =>
      element.removeEventListener('scroll', onScroll, { capture: true })
  }
}

// The content's ref: both listeners, attached once per element
const contentRef = (element: HTMLElement | null): (() => void) | undefined => {
  const stopPreventing = preventScrollWhileDragging(element)
  const stopTracking = trackContentScroll(element)
  return () => {
    stopPreventing?.()
    stopTracking?.()
  }
}

export const contentAttrs = <Item,>(
  model: Model<Item>,
  dispatch: Dispatcher<Msg<Item>>,
): ContentAttrs => ({
  id: contentDomId(model.config.id),
  role: 'dialog',
  'aria-modal': isModal(model.config),
  'aria-label':
    model.config.aria.label._tag === 'Text'
      ? model.config.aria.label.value
      : undefined,
  'aria-labelledby':
    model.config.aria.label._tag === 'ElementId'
      ? model.config.aria.label.id
      : undefined,
  'aria-describedby': O.toUndefined(model.config.aria.describedBy),
  tabIndex: -1,
  'data-drawer': '',
  'data-drawer-direction': model.config.direction,
  'data-state': model.animate._tag,
  'data-snap-points': hasSnapPoints(model.snap) ? 'true' : 'false',
  ref: contentRef,
  style: {
    '--drawer-translate': translateCss(model),
    '--drawer-duration': `${model.config.durationMs}ms`,
  } as CSSProperties,
  onPointerDown: (e) => {
    const press = measurePress(model, e)
    pendingPresses.delete(e.currentTarget)
    if (O.isSome(press)) {
      if (takesPress(model)) {
        pendingPresses.set(e.currentTarget, {
          model,
          press: press.value,
          lastDragPreventedAt: model.lastDragPreventedAt,
        })
      } else {
        // `update` ignores it: the content keeps the gesture
      }
      dispatch({ _tag: 'PointerDown', press: press.value })
    } else if (model.swallowNextClick) {
      // Not a drag start (secondary button, outside the handle, ...), but a
      // press: its click is a tap
      dispatch({ _tag: 'PressIgnored' })
    } else {
      // Not a drag start, and no click to let through again
    }
  },
  // The browser fires a click on the element pressed when a drag of the
  // drawer ends over it (it moved along under the pointer). Stop it before
  // it reaches the content. `Dragging` covers a click that comes before the
  // release is rendered.
  onClickCapture: (e) => {
    const isDrag = model.swallowNextClick || model.animate._tag === 'Dragging'
    // `detail` is 0 for a click from the keyboard
    const isPointerClick = e.detail > 0
    // Not from a portal rendered inside the content (e.g. a nested drawer)
    const isOwnClick =
      e.target instanceof Node && e.currentTarget.contains(e.target)
    if (isDrag && isPointerClick && isOwnClick) {
      e.preventDefault()
      e.stopPropagation()
    } else {
      // A tap
    }
  },
  onTransitionEnd: (e) => {
    // Ignore transitions bubbling up from the content
    if (e.target === e.currentTarget && e.propertyName === 'transform') {
      dispatch({ _tag: 'TransitionEnd' })
    } else {
      // Not the drawer's own movement
    }
  },
})

export const overlayAttrs = <Item,>(
  model: Model<Item>,
  dispatch: Dispatcher<Msg<Item>>,
): OverlayAttrs => ({
  id: overlayDomId(model.config.id),
  'data-drawer-overlay': '',
  'data-state': model.animate._tag,
  style: {
    '--drawer-overlay-opacity': `${overlayOpacity(model)}`,
    '--drawer-duration': `${model.config.durationMs}ms`,
  } as CSSProperties,
  onClick: () => dispatch({ _tag: 'Dismiss' }),
})

// Default views
// ---------------------------------

const directionClassName = (direction: Direction): string => {
  switch (direction) {
    // A share of the drawer's containing block, not of the screen (`dvh`):
    // the page may be shorter than the screen (e.g. above the on-screen
    // keyboard), and the drawer then fits it
    case 'bottom':
      return 'max-h-[96%] rounded-t-2xl'
    case 'top':
      return 'max-h-[96%] rounded-b-2xl'
    case 'left':
      return 'w-3/4 max-w-sm rounded-r-2xl'
    case 'right':
      return 'w-3/4 max-w-sm rounded-l-2xl'
  }
}

export const defaultContentView = ({
  attrs,
  direction,
  className,
  children,
}: ContentUiArg): JSX.Element => (
  <div
    {...attrs}
    className={cn(
      'flex flex-col bg-white shadow-xl outline-none',
      directionClassName(direction),
      className,
    )}
  >
    {children}
  </div>
)

export const defaultOverlayView = ({
  attrs,
  className,
}: OverlayUiArg): JSX.Element => (
  <div {...attrs} className={cn('bg-black/40', className)} />
)

export const defaultHandleView = ({
  attrs,
  className,
  children,
}: HandleUiArg): JSX.Element => (
  <div
    {...attrs}
    className={cn(
      'mx-auto my-3 h-[5px] w-9 shrink-0 cursor-grab rounded-full bg-gray-300 opacity-70 hover:opacity-100',
      className,
    )}
  >
    {children}
  </div>
)

const handleAttrs = <Item,>(
  config: Config<Item>,
  dispatch: Dispatcher<Msg<Item>>,
): HandleAttrs => ({
  'data-drawer-handle': config.direction,
  'aria-hidden': 'true',
  onClick: () => dispatch({ _tag: 'CycleSnap' }),
})

// Drag handle, rendered by the content where it wants it, in the config's
// look (`ui.handle`). A tap cycles through the snap points (closing from the
// last one when dismissible); with `handleOnly`, only the handle starts a
// drag.
export const drawerHandleView = <Item,>(
  config: Config<Item>,
  dispatch: Dispatcher<Msg<Item>>,
  className?: string,
): JSX.Element =>
  (config.ui?.handle ?? defaultHandleView)({
    attrs: handleAttrs(config, dispatch),
    className,
    children: <span data-drawer-handle-hitarea='' />,
  })
