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
import * as A from 'fp-ts/lib/Array'
import * as NEA from 'fp-ts/lib/NonEmptyArray'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'

import {
  type AnimateState,
  type Config,
  type Direction,
  type Model,
  type Press,
  type Snap,
  type SnapConfig,
  type SnapPoint,
  type SnapPoints,
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

// The overlay's element id (the view sets its opacity while dragging)
export const overlayDomId = (id: string): string =>
  `tea-cup-drawer-overlay-${id}`

// Modality
// ---------------------------------

export const isModal = (config: Config): boolean =>
  config.modality._tag === 'Modal'

// Whether opening the drawer locks the body scroll
export const locksBody = (config: Config): boolean =>
  config.modality._tag === 'Modal' && config.modality.lockBody

// Snap points
// ---------------------------------

// The snap points in order (smallest visible size first)
export const snapList = (points: SnapPoints): NEA.NonEmptyArray<SnapPoint> =>
  NEA.concat(A.append(points.active)(points.before), points.after)

// Select the snap point at `index`; `none` when out of range
export const selectSnapPoint =
  (index: number) =>
  (points: SnapPoints): O.Option<SnapPoints> => {
    const list = snapList(points)
    return pipe(
      A.lookup(index)(list),
      O.map((active) => ({
        before: list.slice(0, index),
        active,
        after: list.slice(index + 1),
      })),
    )
  }

// The drawer's snap state as configured, resting at the configured point
// (on init and on every open)
export const snapFromConfig = (config: SnapConfig): Snap => {
  switch (config._tag) {
    case 'NoSnap':
      return { _tag: 'NoSnap' }
    case 'Snap':
      return {
        _tag: 'Snap',
        current: config.initial,
        fadeFrom: config.fadeFrom,
        sequential: config.sequential,
      }
  }
}

// The snap points in order (empty without snap points). The physics below
// works on indexes into this list.
export const snapPointsList = (snap: Snap): SnapPoint[] => {
  switch (snap._tag) {
    case 'NoSnap':
      return []
    case 'Snap':
      return snapList(snap.current)
  }
}

export const hasSnapPoints = (snap: Snap): boolean => snap._tag === 'Snap'

export const lastSnapIndex = (snap: Snap): number =>
  snapPointsList(snap).length - 1

// `fadeFrom`, clamped to the snap points (the last one when `none`)
export const fadeFromIndex = (snap: Snap): number => {
  switch (snap._tag) {
    case 'NoSnap':
      return 0
    case 'Snap': {
      const last = lastSnapIndex(snap)
      const index = O.getOrElse(() => last)(snap.fadeFrom)
      return Math.min(last, Math.max(0, index))
    }
  }
}

const isSequential = (snap: Snap): boolean =>
  snap._tag === 'Snap' && snap.sequential

// Index of the snap point the drawer rests at (0 without snap points, where
// the physics doesn't use it)
export const activeSnapIndex = (snap: Snap): number => {
  switch (snap._tag) {
    case 'NoSnap':
      return 0
    case 'Snap':
      return snap.current.before.length
  }
}

// Rest at the snap point at `index`; `none` when out of range or without
// snap points
export const selectSnap =
  (index: number) =>
  (snap: Snap): O.Option<Snap> => {
    switch (snap._tag) {
      case 'NoSnap':
        return O.none
      case 'Snap':
        return pipe(
          selectSnapPoint(index)(snap.current),
          O.map((current): Snap => ({ ...snap, current })),
        )
    }
  }

// Replace the snap points, keeping the active index (clamped to the new
// points); `none` without snap points, which have no settings to keep
export const replaceSnapPoints =
  (points: NEA.NonEmptyArray<SnapPoint>) =>
  (snap: Snap): O.Option<Snap> => {
    switch (snap._tag) {
      case 'NoSnap':
        return O.none
      case 'Snap': {
        const index = Math.min(activeSnapIndex(snap), points.length - 1)
        return O.some({
          ...snap,
          current: {
            before: points.slice(0, index),
            active: points[index],
            after: points.slice(index + 1),
          },
        })
      }
    }
  }

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

const snapDistanceAt = (snap: Snap, index: number, size: number) =>
  snapDistancePx(snapPointsList(snap)[index], size)

// Distance (px) of the resting position (active snap point, or fully open)
export const restDistancePx = (snap: Snap, size: number): number => {
  switch (snap._tag) {
    case 'NoSnap':
      return 0
    case 'Snap':
      return snapDistancePx(snap.current.active, size)
  }
}

// Rendering
// ---------------------------------

const restDistanceCss = (snap: Snap): string => {
  switch (snap._tag) {
    case 'NoSnap':
      return '0px'
    case 'Snap':
      return snapDistanceCss(snap.current.active)
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
      return restDistanceCss(model.snap)
    case 'Dragging':
      return `${animate.distance}px`
  }
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n))

// Overlay opacity for a drawer at `distance` px, interpolating between the
// snap point before `fadeFromIndex` (transparent) and `fadeFromIndex` (opaque).
// Without snap points it fades over the whole drawer size, like vaul.
export const overlayOpacityAt = (
  snap: Snap,
  size: number,
  distance: number,
): number => {
  if (hasSnapPoints(snap)) {
    const index = fadeFromIndex(snap)
    const opaqueAt = snapDistanceAt(snap, index, size)
    const transparentAt =
      index > 0 ? snapDistanceAt(snap, index - 1, size) : size
    if (transparentAt === opaqueAt) {
      return distance <= opaqueAt ? 1 : 0
    } else {
      return clamp01((transparentAt - distance) / (transparentAt - opaqueAt))
    }
  } else {
    return clamp01(1 - distance / size)
  }
}

const overlayOpacityAtRest = (snap: Snap): number => {
  if (hasSnapPoints(snap)) {
    return activeSnapIndex(snap) >= fadeFromIndex(snap) ? 1 : 0
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
      return overlayOpacityAtRest(model.snap)
    case 'Dragging':
      return overlayOpacityAt(model.snap, animate.press.size, animate.distance)
  }
}

// Whether a pointer is down on the drawer (pressed, or dragging it)
export const isGestureActive = <Item>(animate: AnimateState<Item>): boolean => {
  switch (animate._tag) {
    case 'Dragging':
      return true
    case 'Visible':
    case 'Settling':
      return animate.gesture._tag === 'Pressed'
    case 'Invisible':
    case 'Mounting':
    case 'AnimateIn':
    case 'AnimateOut':
      return false
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

// The current payload, whatever it is: for display. To route the
// content's messages, use `getContent` / `modifyContent` with their key.
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

// The payload, if it still is the one with `key` (like the screen stack's
// `getScreen`): `none` once the drawer has closed or the payload was replaced
// by another one (`Open` while open or closing), so a late reply is dropped
// instead of reaching the new payload
export const getContent =
  (key: string) =>
  <Item>(model: Model<Item>): O.Option<Item> =>
    pipe(
      getInternal(model),
      O.filter((internal) => model.config.uniqueKeyField(internal) === key),
    )

// Update the payload, keeping the animation state, if it still is the one
// with `key`. The same model otherwise, or when `f` would change its key
// (a payload keeps its identity).
export const modifyContent =
  <Item>(key: string, f: (internal: Item) => Item) =>
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
      case 'AnimateOut': {
        const keyOf = model.config.uniqueKeyField
        const next = f(animate.internal)
        if (keyOf(animate.internal) === key && keyOf(next) === key) {
          return { ...model, animate: { ...animate, internal: next } }
        } else {
          // Another payload, or a key change
          return model
        }
      }
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
  snap: Snap,
  press: Press,
  dragged: number,
): number => {
  const distance = press.startDistance - dragged
  if (hasSnapPoints(snap)) {
    // Can't go past the biggest snap point, nor below the smallest one when
    // the drawer can't be dismissed
    const min = snapDistanceAt(snap, lastSnapIndex(snap), press.size)
    const max = config.dismissible
      ? press.size
      : snapDistanceAt(snap, 0, press.size)
    return Math.min(max, Math.max(min, distance))
  } else {
    if (distance < 0) {
      return -Math.max(dampenValue(-distance), 0)
    } else {
      return distance
    }
  }
}

// How a press started to move, read once it travelled `dragThreshold` px
// from the press (the pointer's noise until then): along the drawer axis
// (within `dragAngle` degrees of it, either way) or across it. Decided once
// for the press, from the whole travel rather than one move, as Android's
// touch slop and iOS's pan hysteresis do.
export type GestureStart =
  | { _tag: 'Undecided' }
  | { _tag: 'AlongAxis' }
  | { _tag: 'AcrossAxis' }

export const gestureStart = (
  config: Config,
  pointerType: string,
  dx: number,
  dy: number,
): GestureStart => {
  const threshold =
    pointerType === 'touch'
      ? config.dragThreshold.touch
      : config.dragThreshold.mouse
  if (Math.hypot(dx, dy) < threshold) {
    return { _tag: 'Undecided' }
  } else {
    const vertical = isVertical(config.direction)
    const along = Math.abs(vertical ? dy : dx)
    const across = Math.abs(vertical ? dx : dy)
    const angle = (Math.atan2(across, along) * 180) / Math.PI
    return angle <= config.dragAngle
      ? { _tag: 'AlongAxis' }
      : { _tag: 'AcrossAxis' }
  }
}

// How long after opening (or reaching the last snap point) a gesture
// scrolls the content instead of dragging the drawer (vaul's)
const openDragDelay = 500

export type DragDecision = {
  allow: boolean
  lastDragPreventedAt: O.Option<number>
}

// An element between the pressed element and the drawer: what
// `scrollerTakesGesture` needs from it
export type ScrollBox = {
  scrollTop: number
  scrollHeight: number
  scrollWidth: number
  clientHeight: number
  clientWidth: number
  // Computed `overflow-x` / `overflow-y`
  overflowX: string
  overflowY: string
}

const isScrollable = (overflow: string): boolean =>
  overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay'

// Subpixel scroll positions: closer than this to an edge counts as there
const scrollEdgeTolerance = 1

/**
 * Whether a gesture pressed inside `box` is the scroller's, not the
 * drawer's.
 * - Top and bottom drawers (vaul): while the scroller can still move the way
 *   a closing drag goes, so it scrolls back first. At that edge (a bottom
 *   sheet's list at its top) a swipe drags the drawer, as on iOS.
 * - Left and right drawers: whenever it scrolls sideways at all, whatever
 *   its position. A swipe across a table always scrolls the table; the
 *   drawer is dragged from the rest of its content.
 */
export const scrollerTakesGesture = (
  direction: Direction,
  box: ScrollBox,
): boolean => {
  if (isVertical(direction)) {
    const max = box.scrollHeight - box.clientHeight
    return (
      isScrollable(box.overflowY) &&
      max > scrollEdgeTolerance &&
      (direction === 'bottom'
        ? box.scrollTop > scrollEdgeTolerance
        : box.scrollTop < max - scrollEdgeTolerance)
    )
  } else {
    return (
      isScrollable(box.overflowX) &&
      box.scrollWidth - box.clientWidth > scrollEdgeTolerance
    )
  }
}

/**
 * Port of vaul's `shouldDrag`: whether a gesture should drag the drawer or be
 * left to the content (scrolling, text selection, selects). Unlike vaul, it
 * runs for every direction: vaul always drags a left or right drawer, which
 * takes horizontal scrolls away from its content.
 */
export const decideDrag = (
  config: Config,
  press: Press,
  args: {
    isDraggingInDirection: boolean
    hasSelection: boolean
    time: number
    lastDragPreventedAt: O.Option<number>
    openedAt: O.Option<number>
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
  const isJustOpened = O.exists((at: number) => args.time - at < openDragDelay)(
    args.openedAt,
  )

  if (press.isNoDragTarget) {
    return keep(false)
  } else if (isJustOpened) {
    // Allow scrolling when animating: just opened, or just expanded to its
    // last snap point (its content may be scrollable)
    return keep(false)
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
  } else if (press.scrollerTakesGesture) {
    // Pressed inside a scroller that takes this gesture
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

const closestSnapIndex = (snap: Snap, size: number, distance: number): number =>
  snapPointsList(snap).reduce(
    (best, _point, index) =>
      Math.abs(snapDistanceAt(snap, index, size) - distance) <
      Math.abs(snapDistanceAt(snap, best, size) - distance)
        ? index
        : best,
    0,
  )

const releaseWithSnapPoints = (
  config: Config,
  snap: Snap,
  press: Press,
  args: { dragged: number; distance: number; velocity: number },
): ReleaseDecision => {
  const activeSnap = activeSnapIndex(snap)
  const last = lastSnapIndex(snap)
  const hasDraggedUp = args.dragged > 0

  if (!isSequential(snap) && args.velocity > 2 && !hasDraggedUp) {
    // Strong flick toward closed
    if (config.dismissible) {
      return { _tag: 'Close' }
    } else {
      return { _tag: 'Snap', index: 0 }
    }
  } else if (!isSequential(snap) && args.velocity > 2 && hasDraggedUp) {
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
      index: closestSnapIndex(snap, press.size, args.distance),
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
  snap: Snap,
  press: Press,
  release: { x: number; y: number; time: number },
): ReleaseDecision => {
  const dragged = draggedDistance(config.direction, press, release.x, release.y)
  const distance = dragDistance(config, snap, press, dragged)
  const timeTaken = Math.max(release.time - press.startedAt, 1)
  const velocity = Math.abs(dragged) / timeTaken
  if (hasSnapPoints(snap)) {
    return releaseWithSnapPoints(config, snap, press, {
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
