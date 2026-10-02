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

The drag, release and snap point logic is ported from vaul
(https://github.com/emilkowalski/vaul), Copyright (c) 2023 Emil Kowalski,
MIT License. */
import * as O from 'fp-ts/lib/Option'

import {
  type AnimateState,
  type Config,
  type Direction,
  type Model,
  type Press,
  type SnapPoint,
} from './type'

// Directions
// ---------------------------------

export const isVertical = (direction: Direction): boolean => {
  switch (direction) {
    case 'top':
    case 'bottom':
      return true
    case 'left':
    case 'right':
      return false
  }
}

// 1 when the drawer closes toward increasing coordinates (bottom / right)
export const directionMultiplier = (direction: Direction): number => {
  switch (direction) {
    case 'bottom':
    case 'right':
      return 1
    case 'top':
    case 'left':
      return -1
  }
}

// Distance (px) the pointer moved toward the open position since the press.
// Positive = pulling the drawer open, negative = pushing it closed.
export const draggedDistance = (
  direction: Direction,
  press: Press,
  x: number,
  y: number,
): number => {
  if (isVertical(direction)) {
    return (press.startY - y) * directionMultiplier(direction)
  } else {
    return (press.startX - x) * directionMultiplier(direction)
  }
}

// Ids
// ---------------------------------

export const contentDomId = (id: string): string => `tea-cup-drawer-${id}`

// Snap points
// ---------------------------------

export const hasSnapPoints = (config: Config): boolean =>
  config.snapPoints.length > 0

export const lastSnapIndex = (config: Config): number =>
  config.snapPoints.length - 1

export const fadeFromIndex = (config: Config): number =>
  O.getOrElse(() => lastSnapIndex(config))(config.fadeFromIndex)

// Distance (px) from the open position to the snap point, for a drawer of
// `size` px.
export const snapDistancePx = (snap: SnapPoint, size: number): number => {
  switch (snap._tag) {
    case 'Fraction':
      return (1 - snap.value) * size
    case 'Pixel':
      return size - snap.value
  }
}

// Same as `snapDistancePx` but as a CSS length relative to the drawer itself,
// so resting positions don't need measuring.
export const snapDistanceCss = (snap: SnapPoint): string => {
  switch (snap._tag) {
    case 'Fraction':
      return `${(1 - snap.value) * 100}%`
    case 'Pixel':
      return `calc(100% - ${snap.value}px)`
  }
}

const snapDistanceAt = (config: Config, index: number, size: number) =>
  snapDistancePx(config.snapPoints[index], size)

// Distance (px) of the resting position (active snap point, or fully open)
export const restDistancePx = (
  config: Config,
  activeSnap: number,
  size: number,
): number => {
  if (hasSnapPoints(config)) {
    return snapDistanceAt(config, activeSnap, size)
  } else {
    return 0
  }
}

// Rendering
// ---------------------------------

const restDistanceCss = (config: Config, activeSnap: number): string => {
  if (hasSnapPoints(config)) {
    return snapDistanceCss(config.snapPoints[activeSnap])
  } else {
    return '0px'
  }
}

// Distance toward the closed position the drawer is rendered at, as a CSS
// length. `100%` is fully closed.
export const translateCss = <Item>(model: Model<Item>): string => {
  const animate = model.animate
  switch (animate._tag) {
    case 'Invisible':
    case 'Mounting':
    case 'AnimateOut':
      return '100%'
    case 'AnimateIn':
    case 'Visible':
    case 'Settling':
      return restDistanceCss(model.config, model.activeSnap)
    case 'Dragging':
      return `${animate.distance}px`
  }
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n))

// Overlay opacity for a drawer at `distance` px, interpolating between the
// snap point before `fadeFromIndex` (transparent) and `fadeFromIndex` (opaque).
// Without snap points it fades over the whole drawer size, like vaul.
export const overlayOpacityAt = (
  config: Config,
  size: number,
  distance: number,
): number => {
  if (hasSnapPoints(config)) {
    const index = fadeFromIndex(config)
    const opaqueAt = snapDistanceAt(config, index, size)
    const transparentAt =
      index > 0 ? snapDistanceAt(config, index - 1, size) : size
    if (transparentAt === opaqueAt) {
      return distance <= opaqueAt ? 1 : 0
    } else {
      return clamp01((transparentAt - distance) / (transparentAt - opaqueAt))
    }
  } else {
    return clamp01(1 - distance / size)
  }
}

const overlayOpacityAtRest = (config: Config, activeSnap: number): number => {
  if (hasSnapPoints(config)) {
    return activeSnap >= fadeFromIndex(config) ? 1 : 0
  } else {
    return 1
  }
}

export const overlayOpacity = <Item>(model: Model<Item>): number => {
  const animate = model.animate
  switch (animate._tag) {
    case 'Invisible':
    case 'Mounting':
    case 'AnimateOut':
      return 0
    case 'AnimateIn':
    case 'Visible':
    case 'Settling':
      return overlayOpacityAtRest(model.config, model.activeSnap)
    case 'Dragging':
      return overlayOpacityAt(
        model.config,
        animate.press.size,
        animate.distance,
      )
  }
}

// Whether the drawer is (or is becoming) open; use it to detect open changes
// from the parent, e.g. a swipe that closed the drawer.
export const isOpen = <Item>(animate: AnimateState<Item>): boolean => {
  switch (animate._tag) {
    case 'Invisible':
    case 'AnimateOut':
      return false
    case 'Mounting':
    case 'AnimateIn':
    case 'Visible':
    case 'Dragging':
    case 'Settling':
      return true
  }
}

// Payload
// ---------------------------------

// The payload the drawer was opened with; `none` once it is fully closed.
// Use it to route messages of a TEA component living in the payload, so
// late replies for a closed drawer are dropped.
export const getInternal = <Item>(model: Model<Item>): O.Option<Item> => {
  const animate = model.animate
  switch (animate._tag) {
    case 'Invisible':
      return O.none
    case 'Mounting':
    case 'AnimateIn':
    case 'Visible':
    case 'Dragging':
    case 'Settling':
    case 'AnimateOut':
      return O.some(animate.internal)
  }
}

// Replace the payload, keeping the animation state. No-op once the drawer is
// fully closed (there is nothing to update).
export const setInternal =
  <Item>(internal: Item) =>
  (model: Model<Item>): Model<Item> => {
    const animate = model.animate
    switch (animate._tag) {
      case 'Invisible':
        return model
      case 'Mounting':
      case 'AnimateIn':
      case 'Visible':
      case 'Dragging':
      case 'Settling':
      case 'AnimateOut':
        return { ...model, animate: { ...animate, internal } }
    }
  }

// Dragging
// ---------------------------------

/**
 * Rubber-band resistance when the drawer is pulled past its open position.
 */
export const dampenValue = (v: number): number => 8 * (Math.log(v + 1) - 2)

/**
 * Distance (px) toward the closed position for a pointer that moved
 * `dragged` px toward the open position since the press.
 */
export const dragDistance = (
  config: Config,
  press: Press,
  dragged: number,
): number => {
  const distance = press.startDistance - dragged
  if (hasSnapPoints(config)) {
    // Can't go past the biggest snap point, nor below the smallest one when
    // the drawer can't be dismissed
    const min = snapDistanceAt(config, lastSnapIndex(config), press.size)
    const max = config.dismissible
      ? press.size
      : snapDistanceAt(config, 0, press.size)
    return Math.min(max, Math.max(min, distance))
  } else {
    if (distance < 0) {
      return -Math.max(dampenValue(-distance), 0)
    } else {
      return distance
    }
  }
}

/**
 * Port of vaul's `isDeltaInDirection`: whether a pointer that moved by
 * `(dx, dy)` since the press moves along the drawer axis. Small moves in the
 * closing direction only count when they are mostly along the axis.
 */
export const isDeltaInDirection = (
  direction: Direction,
  dx: number,
  dy: number,
  threshold: number,
): boolean => {
  const factor = directionMultiplier(direction)
  const isDeltaX = Math.abs(dx) > Math.abs(dy)
  if (isVertical(direction)) {
    const isReverseDirection = dy * factor < 0
    if (!isReverseDirection && Math.abs(dy) <= threshold) {
      return !isDeltaX
    } else {
      return true
    }
  } else {
    const isReverseDirection = dx * factor < 0
    if (!isReverseDirection && Math.abs(dx) <= threshold) {
      return isDeltaX
    } else {
      return true
    }
  }
}

// Pointers move a few px when tapping; ignore that before deciding.
export const swipeStartThreshold = (pointerType: string): number =>
  pointerType === 'touch' ? 10 : 2

export type DragDecision = {
  allow: boolean
  lastDragPreventedAt: O.Option<number>
}

/**
 * Port of vaul's `shouldDrag`: whether a gesture should drag the drawer or be
 * left to the content (scrolling, text selection, selects).
 */
export const decideDrag = (
  config: Config,
  press: Press,
  args: {
    isDraggingInDirection: boolean
    hasSelection: boolean
    time: number
    lastDragPreventedAt: O.Option<number>
  },
): DragDecision => {
  const keep = (allow: boolean): DragDecision => ({
    allow,
    lastDragPreventedAt: args.lastDragPreventedAt,
  })
  const prevent: DragDecision = {
    allow: false,
    lastDragPreventedAt: O.some(args.time),
  }
  // The drawer is away from its open position (settling or on a snap
  // point), so any gesture moves it
  const isSwiped = press.startDistance > 0.5
  const isWithinScrollLock = O.exists(
    (at: number) => args.time - at < config.scrollLockTimeout,
  )(args.lastDragPreventedAt)

  if (press.isNoDragTarget) {
    return keep(false)
  } else if (!isVertical(config.direction)) {
    return keep(true)
  } else if (isSwiped) {
    return keep(true)
  } else if (args.hasSelection) {
    // Don't drag if there's highlighted text
    return keep(false)
  } else if (isWithinScrollLock) {
    // Disallow dragging if the content was scrolled within `scrollLockTimeout`
    return prevent
  } else if (args.isDraggingInDirection) {
    // Pulling an open drawer further open scrolls the content instead
    return prevent
  } else if (press.hasScrolledAncestor) {
    // The content is scrolled, so the gesture scrolls it back first
    return prevent
  } else {
    return keep(true)
  }
}

// Release
// ---------------------------------

export type ReleaseDecision =
  | { _tag: 'Close' }
  | { _tag: 'Snap'; index: number }
  // Spring back to the active snap point / open position
  | { _tag: 'Reset' }

const closestSnapIndex = (
  config: Config,
  size: number,
  distance: number,
): number =>
  config.snapPoints.reduce(
    (best, _snap, index) =>
      Math.abs(snapDistanceAt(config, index, size) - distance) <
      Math.abs(snapDistanceAt(config, best, size) - distance)
        ? index
        : best,
    0,
  )

const releaseWithSnapPoints = (
  config: Config,
  activeSnap: number,
  press: Press,
  args: { dragged: number; distance: number; velocity: number },
): ReleaseDecision => {
  const last = lastSnapIndex(config)
  const hasDraggedUp = args.dragged > 0

  if (!config.snapToSequentialPoint && args.velocity > 2 && !hasDraggedUp) {
    // Strong flick toward closed
    if (config.dismissible) {
      return { _tag: 'Close' }
    } else {
      return { _tag: 'Snap', index: 0 }
    }
  } else if (
    !config.snapToSequentialPoint &&
    args.velocity > 2 &&
    hasDraggedUp
  ) {
    // Strong flick toward open
    return { _tag: 'Snap', index: last }
  } else if (
    args.velocity > config.velocityThreshold &&
    Math.abs(args.dragged) < press.viewport * 0.4
  ) {
    // Flick: move one snap point in the flick direction
    if (hasDraggedUp && activeSnap === last) {
      return { _tag: 'Snap', index: last }
    } else if (!hasDraggedUp && activeSnap === 0 && config.dismissible) {
      return { _tag: 'Close' }
    } else {
      const next = activeSnap + (hasDraggedUp ? 1 : -1)
      return { _tag: 'Snap', index: Math.min(last, Math.max(0, next)) }
    }
  } else {
    return {
      _tag: 'Snap',
      index: closestSnapIndex(config, press.size, args.distance),
    }
  }
}

const releaseWithoutSnapPoints = (
  config: Config,
  press: Press,
  args: { dragged: number; distance: number; velocity: number },
): ReleaseDecision => {
  const visibleSize = Math.min(press.size, press.viewport)
  if (args.dragged > 0) {
    // Moved toward open: spring back
    return { _tag: 'Reset' }
  } else if (args.velocity > config.velocityThreshold) {
    return { _tag: 'Close' }
  } else if (Math.abs(args.distance) >= visibleSize * config.closeThreshold) {
    return { _tag: 'Close' }
  } else {
    return { _tag: 'Reset' }
  }
}

/**
 * Port of vaul's `onRelease`: what the drawer does when a drag ends at
 * `(x, y)` at `time`.
 */
export const decideRelease = (
  config: Config,
  activeSnap: number,
  press: Press,
  release: { x: number; y: number; time: number },
): ReleaseDecision => {
  const dragged = draggedDistance(config.direction, press, release.x, release.y)
  const distance = dragDistance(config, press, dragged)
  const timeTaken = Math.max(release.time - press.startedAt, 1)
  const velocity = Math.abs(dragged) / timeTaken
  if (hasSnapPoints(config)) {
    return releaseWithSnapPoints(config, activeSnap, press, {
      dragged,
      distance,
      velocity,
    })
  } else {
    return releaseWithoutSnapPoints(config, press, {
      dragged,
      distance,
      velocity,
    })
  }
}
