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
import { type CSSProperties, type JSX, type PointerEvent } from 'react'
import { type Dispatcher } from 'tea-cup-fp'

import {
  type ContentAttrs,
  type ContentUiArg,
  type Direction,
  type Model,
  type Msg,
  type OverlayAttrs,
  type OverlayUiArg,
  type Press,
} from './type'
import {
  contentDomId,
  directionMultiplier,
  isVertical,
  overlayOpacity,
  restDistancePx,
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

// Whether a scrollable element between `target` and the drawer (included) is
// scrolled away from the top.
const hasScrolledAncestor = (
  target: Element,
  content: HTMLElement,
): boolean => {
  let element: Element | null = target
  let found = false
  while (element !== null && !found) {
    if (
      element.scrollHeight > element.clientHeight &&
      element.scrollTop !== 0
    ) {
      found = true
    } else if (element === content) {
      element = null
    } else {
      element = element.parentElement
    }
  }
  return found
}

const measurePress = <A,>(
  model: Model<A>,
  e: PointerEvent<HTMLElement>,
): O.Option<Press> => {
  const config = model.config
  const content = e.currentTarget
  const target = e.target instanceof Element ? e.target : content
  const isHandle = target.closest('[data-drawer-handle]') !== null
  if (e.button !== 0 || !e.isPrimary) {
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
        ? restDistancePx(config, model.activeSnap, size)
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
      hasScrolledAncestor: hasScrolledAncestor(target, content),
    })
  }
}

// Attributes
// ---------------------------------

export const contentAttrs = <A,>(
  model: Model<A>,
  dispatch: Dispatcher<Msg<A>>,
): ContentAttrs => ({
  id: contentDomId(model.config.id),
  role: 'dialog',
  'aria-modal': model.config.modal,
  tabIndex: -1,
  'data-drawer': '',
  'data-drawer-direction': model.config.direction,
  'data-state': model.animate._tag,
  'data-snap-points': model.config.snapPoints.length > 0 ? 'true' : 'false',
  style: {
    '--drawer-translate': translateCss(model),
    '--drawer-duration': `${model.config.durationMs}ms`,
  } as CSSProperties,
  onPointerDown: (e) => {
    const press = measurePress(model, e)
    if (O.isSome(press)) {
      dispatch({ _tag: 'PointerDown', press: press.value })
    } else {
      // Not a drag start (secondary button, outside the handle, ...)
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

export const overlayAttrs = <A,>(
  model: Model<A>,
  dispatch: Dispatcher<Msg<A>>,
): OverlayAttrs => ({
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
    case 'bottom':
      return 'max-h-[96dvh] rounded-t-2xl'
    case 'top':
      return 'max-h-[96dvh] rounded-b-2xl'
    case 'left':
      return 'w-3/4 max-w-sm rounded-r-2xl'
    case 'right':
      return 'w-3/4 max-w-sm rounded-l-2xl'
  }
}

export const defaultContentView =
  (className?: string) =>
  ({ attrs, direction, children }: ContentUiArg): JSX.Element => (
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

export const defaultOverlayView =
  (className?: string) =>
  ({ attrs }: OverlayUiArg): JSX.Element => (
    <div {...attrs} className={cn('bg-black/40', className)} />
  )
