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
import { EqAlways, UndefinableEq } from '@rinn7e/tea-cup-prelude'
import * as A from 'fp-ts/lib/Array'
import * as EqClass from 'fp-ts/lib/Eq'
import { type NonEmptyArray } from 'fp-ts/lib/NonEmptyArray'
import * as O from 'fp-ts/lib/Option'
import * as B from 'fp-ts/lib/boolean'
import * as N from 'fp-ts/lib/number'
import * as S from 'fp-ts/lib/string'
import {
  type CSSProperties,
  type JSX,
  type MouseEventHandler,
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

// The snap points in order (smallest visible size first), with one of them
// selected: a zipper, so the selection always exists and is always one of
// the points.
export type SnapPoints = {
  before: SnapPoint[]
  active: SnapPoint
  after: SnapPoint[]
}

export const SnapPointsEq: EqClass.Eq<SnapPoints> = EqClass.struct<SnapPoints>({
  before: A.getEq(SnapPointEq),
  active: SnapPointEq,
  after: A.getEq(SnapPointEq),
})

// Initial snap setup, read only to create the model's `Snap` (on init and
// on every open). Without snap points the drawer rests fully open, and none
// of the snap settings exist.
export type SnapConfig =
  | { _tag: 'NoSnap' }
  | {
      _tag: 'Snap'
      // `active`: the snap point the drawer opens at
      initial: SnapPoints
      // Index of the snap point from which the overlay is fully visible
      // (`none` = the last one; clamped to the snap points)
      fadeFrom: O.Option<number>
      // Release a flick on the next snap point instead of skipping to the
      // edge
      sequential: boolean
    }

// Modal drawers render an overlay, trap focus and (with `lockBody`) lock
// the body scroll. Non-modal drawers leave the page behind them interactive.
export type Modality =
  | { _tag: 'NonModal' }
  // `lockBody: false`: don't touch `document.body` styles
  | { _tag: 'Modal'; lockBody: boolean }

// The drawer's accessible name. A `role="dialog"` needs one, so it is
// required.
export type AriaLabel =
  // A fixed name (`aria-label`)
  | { _tag: 'Text'; value: string }
  // The id of an element inside the content that names the drawer, usually
  // its title (`aria-labelledby`); its text may change with the payload
  | { _tag: 'ElementId'; id: string }

// How assistive technologies announce the drawer
export type AriaConfig = {
  label: AriaLabel
  // The id of an element inside the content that describes the drawer
  // (`aria-describedby`)
  describedBy: O.Option<string>
}

// Where the drawer is rendered in the DOM.
export type Portal =
  | { _tag: 'Body' }
  | { _tag: 'Inline' }
  | { _tag: 'Container'; get: () => HTMLElement | null }

// `Item` is the payload type; it only appears in `uniqueKeyField`, so the
// rest of the drawer works with any `Config` (`Item` defaults to `unknown`).
export type Config<Item = unknown> = {
  // Unique id, used to derive DOM ids and to restore focus on close
  id: string
  // Identifies the payload (like tea-cup-pagination's `uniqueKeyField`).
  // Content messages carry this key, so a reply from a payload that was
  // replaced (`Open` while open or closing) or closed is dropped instead of
  // reaching the new one. A constant for a drawer without payload.
  // Declared as a method so a `Config<Item>` is usable as a `Config`.
  uniqueKeyField(internal: Item): string
  aria: AriaConfig
  direction: Direction
  modality: Modality
  // When false, only a programmatic `Close` closes the drawer: overlay
  // clicks and swipes are ignored.
  dismissible: boolean
  snap: SnapConfig
  // Only elements inside the handle (`drawerHandleView`) start a drag
  handleOnly: boolean
  // Focus the first focusable element on open instead of the drawer itself
  // (keep false on mobile to avoid popping the keyboard)
  autoFocus: boolean
  // Bottom drawers only: while a text field in the drawer is focused and the
  // on-screen keyboard is open, lift the drawer above the keyboard and cap
  // its height to the visible area (vaul's `repositionInputs`)
  repositionInputs: boolean
  // Fraction of the drawer size that a slow swipe has to cover to close it
  closeThreshold: number
  // px/ms above which a swipe counts as a flick
  velocityThreshold: number
  // Time (ms) after a content scroll during which dragging stays disabled
  scrollLockTimeout: number
  // Duration (ms) of the open, close and snap transitions
  durationMs: number
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

// Every phase the drawer can be in. `internal` is the payload the drawer was
// opened with; it is kept until the drawer is fully closed, so the content
// still renders while it animates out. A press can only start at rest
// (`Visible`, `Settling`), so only those carry a `gesture`; once it becomes a
// drag, `Dragging` holds the press.
//
// Invisible  ─Open→  Mounting ─(next frame)→ AnimateIn ─(transitionend)→ Visible
// Visible    ─Close→ AnimateOut ─(transitionend)→ Invisible
// Visible    ─drag→  Dragging ─release→ Settling (snap/spring back) | AnimateOut
export type AnimateState<Item> =
  | { _tag: 'Invisible' }
  // Rendered at the closed position, waiting one frame so the transition to
  // the open position runs
  | { _tag: 'Mounting'; internal: Item }
  | { _tag: 'AnimateIn'; internal: Item }
  | { _tag: 'Visible'; internal: Item; gesture: Gesture }
  // The pointer controls the position; no CSS transition
  | {
      _tag: 'Dragging'
      internal: Item
      press: Press
      // Current distance (px) toward the closed position (negative while
      // pulled past the open position)
      distance: number
      last: PointerPosition
    }
  // Transitioning to the active snap point after a release
  | { _tag: 'Settling'; internal: Item; gesture: Gesture }
  | { _tag: 'AnimateOut'; internal: Item }

export const getAnimateStateEq = <Item>(
  itemEq: EqClass.Eq<Item>,
): EqClass.Eq<AnimateState<Item>> => ({
  equals: (x, y) => {
    switch (x._tag) {
      case 'Invisible':
        return y._tag === 'Invisible'
      case 'Mounting':
      case 'AnimateIn':
      case 'AnimateOut':
        return y._tag === x._tag && itemEq.equals(x.internal, y.internal)
      case 'Visible':
      case 'Settling':
        return (
          y._tag === x._tag &&
          itemEq.equals(x.internal, y.internal) &&
          GestureEq.equals(x.gesture, y.gesture)
        )
      case 'Dragging':
        return (
          y._tag === 'Dragging' &&
          itemEq.equals(x.internal, y.internal) &&
          PressEq.equals(x.press, y.press) &&
          x.distance === y.distance &&
          PointerPositionEq.equals(x.last, y.last)
        )
    }
  },
})

// Model
// ---------------------------------

// The snap state of the drawer, created from a `SnapConfig`. `current.active`
// is where the drawer rests now (a zipper: always one of the points). Its
// zipper is named differently from `SnapConfig`'s (`current` / `initial`):
// with the same shape, TypeScript would accept one for the other.
export type Snap =
  | { _tag: 'NoSnap' }
  | {
      _tag: 'Snap'
      current: SnapPoints
      // Index of the snap point from which the overlay is fully visible
      // (`none` = the last one; clamped to the snap points)
      fadeFrom: O.Option<number>
      sequential: boolean
    }

export const SnapEq: EqClass.Eq<Snap> = {
  equals: (x, y) => {
    switch (x._tag) {
      case 'NoSnap':
        return y._tag === 'NoSnap'
      case 'Snap':
        return (
          y._tag === 'Snap' &&
          SnapPointsEq.equals(x.current, y.current) &&
          O.getEq(N.Eq).equals(x.fadeFrom, y.fadeFrom) &&
          x.sequential === y.sequential
        )
    }
  },
}

export type Model<Item> = {
  animate: AnimateState<Item>
  // The snap state: created from `config.snap` on init and on every open;
  // the physics, the overlay and the view read only this
  snap: Snap
  // `Event.timeStamp` of the last time a gesture scrolled the content
  // instead of dragging the drawer
  lastDragPreventedAt: O.Option<number>
  // The last press dragged the drawer: the click the browser fires on its
  // release (on the element pressed, which moved along under the pointer) is
  // not a tap, and is swallowed. The next press clears it.
  swallowNextClick: boolean
  // Incremented whenever an animation starts, so frame and timeout messages
  // of an interrupted animation are ignored
  seq: number
  config: Config<Item>
}

export const getModelEq = <Item>(
  itemEq: EqClass.Eq<Item>,
): EqClass.Eq<Model<Item>> =>
  EqClass.struct<Model<Item>>({
    animate: getAnimateStateEq(itemEq),
    snap: SnapEq,
    lastDragPreventedAt: O.getEq(N.Eq),
    swallowNextClick: B.Eq,
    seq: N.Eq,
    config: ConfigEq,
  })

// Msg
// ---------------------------------

// `ItemMsg`: the messages of the content (`never` when it has none)
export type Msg<Item, ItemMsg = never> =
  // Open the drawer with a payload, or replace the payload while it is open
  | { _tag: 'Open'; internal: Item }
  // From the content's view (`contentDispatch`), with the payload's key.
  // Not handled here: the owner intercepts it and updates the payload with
  // `getContent` / `modifyContent`.
  | { _tag: 'ContentMsg'; key: string; msg: ItemMsg }
  // Close the drawer (always honored)
  | { _tag: 'Close' }
  // Close requested by the user (overlay tap, or a key the owner handles);
  // ignored when not dismissible
  | { _tag: 'Dismiss' }
  | { _tag: 'SetSnap'; index: number }
  // Replace the snap points (e.g. measured from the content), keeping the
  // active index (clamped). They last until the drawer closes: every open
  // starts again from `config.snap`. Ignored while invisible or without snap
  // points.
  | { _tag: 'SetSnapPoints'; points: NonEmptyArray<SnapPoint> }
  // Tap on the handle: move to the next snap point
  | { _tag: 'CycleSnap' }
  | { _tag: 'MountFrame'; seq: number }
  // The drawer's own transform transition finished
  | { _tag: 'TransitionEnd' }
  // Fallback for a `transitionend` that never fires
  | { _tag: 'AnimationTimeout'; seq: number }
  | { _tag: 'PointerDown'; press: Press }
  // A press the drawer doesn't drag from (secondary button, outside the
  // handle, ...): a click may follow, so it ends `swallowNextClick`
  | { _tag: 'PressIgnored' }
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
  'aria-label': string | undefined
  'aria-labelledby': string | undefined
  'aria-describedby': string | undefined
  tabIndex: number
  'data-drawer': ''
  'data-drawer-direction': Direction
  'data-state': AnimateState<unknown>['_tag']
  'data-snap-points': 'true' | 'false'
  style: CSSProperties
  onPointerDown: PointerEventHandler<HTMLElement>
  onClickCapture: MouseEventHandler<HTMLElement>
  ref: (element: HTMLElement | null) => (() => void) | undefined
  onTransitionEnd: TransitionEventHandler<HTMLElement>
}

export type OverlayAttrs = {
  'data-drawer-overlay': ''
  'data-state': AnimateState<unknown>['_tag']
  style: CSSProperties
  onClick: () => void
}

// `className` is the view's `className` / `overlayClassName` prop, for a
// `ui` override to merge with its own
export type ContentUiArg = {
  attrs: ContentAttrs
  direction: Direction
  className: string | undefined
  children: ReactNode
}

export type OverlayUiArg = {
  attrs: OverlayAttrs
  className: string | undefined
}

// Attributes of the drag handle; spread them on the element when
// overriding the view with `ui.handle`.
export type HandleAttrs = {
  'data-drawer-handle': ''
  'aria-hidden': 'true'
  onClick: () => void
}

// `className` is the one given to `drawerHandleView`; `children` is the
// handle's larger hit area, to render inside the handle
export type HandleUiArg = {
  attrs: HandleAttrs
  className: string | undefined
  children: ReactNode
}

export type Ui = {
  content?: (arg: ContentUiArg) => JSX.Element
  overlay?: (arg: OverlayUiArg) => JSX.Element
  handle?: (arg: HandleUiArg) => JSX.Element
}

// The drawer content has two sources of data, like link-pagination's `Item`
// and `Parent`:
// - `internal` (`Item`): owned by the drawer. Set by `Open`, kept while the
//   drawer slides out, dropped once it is closed. Use it for state that lives
//   and dies with the drawer (the default).
// - `parent` (`Parent`): owned by the parent and only borrowed for rendering.
//   Use it for state that must outlive the drawer (a draft) or that the parent
//   owns anyway (current user, selection).
// The content sends its own messages with `contentDispatch` (a
// `ContentMsg` with the payload's key), like the screen stack's
// `screenDispatch`. `renderContent` must only use its arguments: don't pass
// the owner's `dispatch`
// into it, and anything else it closes over is invisible to `DrawerMemo`.
export type Props<Item, ItemMsg, Parent> = {
  model: Model<Item>
  dispatch: Dispatcher<Msg<Item, ItemMsg>>
  renderContent: (
    content: Item,
    contentDispatch: (msg: ItemMsg) => void,
    parent: Parent,
  ) => ReactNode
  itemEq: EqClass.Eq<Item>
  parent: Parent
  parentEq: EqClass.Eq<Parent>
  className?: string
  overlayClassName?: string
}

export const getPropsEq = <Item, ItemMsg, Parent>(
  itemEq: EqClass.Eq<Item>,
  parentEq: EqClass.Eq<Parent>,
): EqClass.Eq<Props<Item, ItemMsg, Parent>> =>
  EqClass.struct<Props<Item, ItemMsg, Parent>>({
    model: getModelEq(itemEq),
    dispatch: EqAlways,
    renderContent: EqAlways,
    itemEq: EqAlways,
    parent: parentEq,
    parentEq: EqAlways,
    className: UndefinableEq(S.Eq),
    overlayClassName: UndefinableEq(S.Eq),
  })
