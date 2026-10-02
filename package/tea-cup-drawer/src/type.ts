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
import { EqAlways } from '@rinn7e/tea-cup-prelude'
import * as EqClass from 'fp-ts/lib/Eq'
import * as O from 'fp-ts/lib/Option'
import * as B from 'fp-ts/lib/boolean'
import * as N from 'fp-ts/lib/number'
import * as S from 'fp-ts/lib/string'
import {
  type CSSProperties,
  type JSX,
  type PointerEventHandler,
  type ReactNode,
  type TransitionEventHandler,
} from 'react'
import { type Dispatcher } from 'tea-cup-fp'

// Config
// ---------------------------------

// The edge of the screen the drawer is attached to.
export type Direction = 'top' | 'bottom' | 'left' | 'right'

// A resting position of the drawer, measured as how much of the drawer is
// visible. Snap points require the drawer to span the whole screen along its
// axis (e.g. `h-full` for a bottom drawer), like in vaul.
export type SnapPoint =
  // Fraction (0..1) of the drawer size
  | { _tag: 'Fraction'; value: number }
  // Visible size in px
  | { _tag: 'Pixel'; value: number }

export const SnapPointEq: EqClass.Eq<SnapPoint> = {
  equals: (x, y) => x._tag === y._tag && x.value === y.value,
}

// Where the drawer is rendered in the DOM.
export type Portal =
  | { _tag: 'Body' }
  | { _tag: 'Inline' }
  | { _tag: 'Container'; get: () => HTMLElement | null }

export type Config = {
  // Unique id, used to derive DOM ids and to restore focus on close
  id: string
  direction: Direction
  // Modal drawers render an overlay, lock the body scroll and trap focus.
  // Non-modal drawers leave the page behind them interactive.
  modal: boolean
  // When false, only a programmatic `Close` closes the drawer: overlay
  // clicks, Escape and swipes are ignored.
  dismissible: boolean
  snapPoints: SnapPoint[]
  // Index of the snap point the drawer opens at
  initialSnap: number
  // Snap index from which the overlay is fully visible (`none` = the last one)
  fadeFromIndex: O.Option<number>
  // Release a flick on the next snap point instead of skipping to the edge
  snapToSequentialPoint: boolean
  // Only elements inside `DrawerHandle` start a drag
  handleOnly: boolean
  // Focus the first focusable element on open instead of the drawer itself
  // (keep false on mobile to avoid popping the keyboard)
  autoFocus: boolean
  // Fraction of the drawer size that a slow swipe has to cover to close it
  closeThreshold: number
  // px/ms above which a swipe counts as a flick
  velocityThreshold: number
  // Time (ms) after a content scroll during which dragging stays disabled
  scrollLockTimeout: number
  // Duration (ms) of the open, close and snap transitions
  durationMs: number
  // Don't touch `document.body` styles (scroll lock) when open
  noBodyStyles: boolean
  portal: Portal
  ui?: Ui
}

export const ConfigEq: EqClass.Eq<Config> = EqAlways

// Animation state
// ---------------------------------

// Pointer position and drawer measurements captured on pointer down
export type Press = {
  pointerType: string
  startX: number
  startY: number
  // `Event.timeStamp` of the pointer down
  startedAt: number
  // Distance (px) the drawer was translated toward its closed position at
  // the moment of the press (non-zero while settling or on a snap point)
  startDistance: number
  // Drawer size along its axis (px)
  size: number
  // Window size along the drawer axis (px)
  viewport: number
  // The press started on a `select` or inside `[data-drawer-no-drag]`
  isNoDragTarget: boolean
  // The press started inside a scrollable element that is not scrolled to
  // the top, so the gesture should scroll it instead of dragging
  hasScrolledAncestor: boolean
}

export const PressEq: EqClass.Eq<Press> = EqClass.struct<Press>({
  pointerType: S.Eq,
  startX: N.Eq,
  startY: N.Eq,
  startedAt: N.Eq,
  startDistance: N.Eq,
  size: N.Eq,
  viewport: N.Eq,
  isNoDragTarget: B.Eq,
  hasScrolledAncestor: B.Eq,
})

// Last known pointer position, used to release a drag on `pointercancel` /
// `contextmenu`, which don't carry a reliable position
export type PointerPosition = { x: number; y: number }

export const PointerPositionEq: EqClass.Eq<PointerPosition> =
  EqClass.struct<PointerPosition>({ x: N.Eq, y: N.Eq })

// Every phase the drawer can be in. `internal` is the payload the drawer was
// opened with; it is kept until the drawer is fully closed, so the content
// still renders while it animates out.
//
// Invisible  ─Open→  Mounting ─(next frame)→ AnimateIn ─(transitionend)→ Visible
// Visible    ─Close→ AnimateOut ─(transitionend)→ Invisible
// Visible    ─drag→  Dragging ─release→ Settling (snap/spring back) | AnimateOut
export type AnimateState<A> =
  | { _tag: 'Invisible' }
  // Rendered at the closed position, waiting one frame so the transition to
  // the open position runs
  | { _tag: 'Mounting'; internal: A }
  | { _tag: 'AnimateIn'; internal: A }
  | { _tag: 'Visible'; internal: A }
  // The pointer controls the position; no CSS transition
  | {
      _tag: 'Dragging'
      internal: A
      press: Press
      // Current distance (px) toward the closed position (negative while
      // pulled past the open position)
      distance: number
      last: PointerPosition
    }
  // Transitioning to the active snap point after a release
  | { _tag: 'Settling'; internal: A }
  | { _tag: 'AnimateOut'; internal: A }

export const getAnimateStateEq = <A>(
  aEq: EqClass.Eq<A>,
): EqClass.Eq<AnimateState<A>> => ({
  equals: (x, y) => {
    switch (x._tag) {
      case 'Invisible':
        return y._tag === 'Invisible'
      case 'Mounting':
      case 'AnimateIn':
      case 'Visible':
      case 'Settling':
      case 'AnimateOut':
        return y._tag === x._tag && aEq.equals(x.internal, y.internal)
      case 'Dragging':
        return (
          y._tag === 'Dragging' &&
          aEq.equals(x.internal, y.internal) &&
          PressEq.equals(x.press, y.press) &&
          x.distance === y.distance &&
          PointerPositionEq.equals(x.last, y.last)
        )
    }
  },
})

// A pointer is down on the drawer but it is not known yet whether the
// gesture is a drag, a tap or a scroll of the content.
export type Gesture =
  | { _tag: 'Idle' }
  | { _tag: 'Pressed'; press: Press; last: PointerPosition }

export const GestureEq: EqClass.Eq<Gesture> = {
  equals: (x, y) => {
    switch (x._tag) {
      case 'Idle':
        return y._tag === 'Idle'
      case 'Pressed':
        return (
          y._tag === 'Pressed' &&
          PressEq.equals(x.press, y.press) &&
          PointerPositionEq.equals(x.last, y.last)
        )
    }
  },
}

// Model
// ---------------------------------

export type Model<A> = {
  animate: AnimateState<A>
  gesture: Gesture
  activeSnap: number
  // `Event.timeStamp` of the last time a gesture scrolled the content
  // instead of dragging the drawer
  lastDragPreventedAt: O.Option<number>
  // Incremented whenever an animation starts, so frame and timeout messages
  // of an interrupted animation are ignored
  seq: number
  config: Config
}

export const getModelEq = <A>(aEq: EqClass.Eq<A>): EqClass.Eq<Model<A>> =>
  EqClass.struct<Model<A>>({
    animate: getAnimateStateEq(aEq),
    gesture: GestureEq,
    activeSnap: N.Eq,
    lastDragPreventedAt: O.getEq(N.Eq),
    seq: N.Eq,
    config: ConfigEq,
  })

// Msg
// ---------------------------------

export type Msg<A> =
  // Open the drawer with a payload, or replace the payload while it is open
  | { _tag: 'Open'; internal: A }
  // Close the drawer (always honored)
  | { _tag: 'Close' }
  // Close requested by the user (overlay, Escape); ignored when not dismissible
  | { _tag: 'Dismiss' }
  | { _tag: 'SetSnap'; index: number }
  // Tap on the handle: move to the next snap point
  | { _tag: 'CycleSnap' }
  | { _tag: 'MountFrame'; seq: number }
  // The drawer's own transform transition finished
  | { _tag: 'TransitionEnd' }
  // Fallback for a `transitionend` that never fires
  | { _tag: 'AnimationTimeout'; seq: number }
  | { _tag: 'PointerDown'; press: Press }
  | {
      _tag: 'PointerMove'
      x: number
      y: number
      time: number
      hasSelection: boolean
    }
  | { _tag: 'PointerUp'; x: number; y: number; time: number }
  // `pointercancel` / `contextmenu`: release at the last known position
  | { _tag: 'PointerCancel'; time: number }
  | { _tag: 'NoOp' }

// View
// ---------------------------------

// Attributes the drawer content element needs; spread them on the element
// when overriding the view with `ui.content`.
export type ContentAttrs = {
  id: string
  role: 'dialog'
  'aria-modal': boolean
  tabIndex: number
  'data-drawer': ''
  'data-drawer-direction': Direction
  'data-state': AnimateState<unknown>['_tag']
  'data-snap-points': 'true' | 'false'
  style: CSSProperties
  onPointerDown: PointerEventHandler<HTMLElement>
  onTransitionEnd: TransitionEventHandler<HTMLElement>
}

export type OverlayAttrs = {
  'data-drawer-overlay': ''
  'data-state': AnimateState<unknown>['_tag']
  style: CSSProperties
  onClick: () => void
}

export type ContentUiArg = {
  attrs: ContentAttrs
  direction: Direction
  children: ReactNode
}

export type OverlayUiArg = {
  attrs: OverlayAttrs
}

export type Ui = {
  content?: (arg: ContentUiArg) => JSX.Element
  overlay?: (arg: OverlayUiArg) => JSX.Element
}

export type Props<A> = {
  model: Model<A>
  dispatch: Dispatcher<Msg<A>>
  // Renders the drawer content from the payload it was opened with
  children: (internal: A) => ReactNode
  className?: string
  overlayClassName?: string
}
