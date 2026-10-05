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
import { delayCmd } from '@rinn7e/tea-cup-prelude'
import type * as NEA from 'fp-ts/lib/NonEmptyArray'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import {
  afterNextPaintCmd,
  focusContentCmd,
  rememberFocusCmd,
  restoreFocusCmd,
} from './effect'
import {
  type AnimateState,
  type AriaConfig,
  type Config,
  type Gesture,
  type Model,
  type Msg,
  type PointerPosition,
  type Press,
  SnapEq,
  type SnapPoint,
  SnapPointEq,
  type Ui,
} from './type'
import {
  activeSnapIndex,
  decideDrag,
  decideRelease,
  dragDistance,
  draggedDistance,
  gestureStart,
  hasSnapPoints,
  lastSnapIndex,
  replaceSnapPoints,
  selectSnap,
  snapFromConfig,
} from './util'

// Defaults (vaul's)
// ---------------------------------

// `ui` overrides the default views (an app's own look)
export const defaultConfig = <Item>(
  id: string,
  uniqueKeyField: (internal: Item) => string,
  aria: AriaConfig,
  ui?: Ui,
): Config<Item> => ({
  id,
  uniqueKeyField,
  aria,
  direction: 'bottom',
  modality: { _tag: 'Modal', lockBody: true },
  dismissible: true,
  snap: { _tag: 'NoSnap' },
  handleOnly: false,
  autoFocus: false,
  repositionInputs: true,
  closeThreshold: 0.25,
  velocityThreshold: 0.4,
  scrollLockTimeout: 100,
  dragThreshold: { touch: 10, mouse: 2 },
  dragAngle: 30,
  durationMs: 500,
  portal: { _tag: 'Body' },
  ui,
})

export const defaultModel = <Item>(config: Config<Item>): Model<Item> => ({
  animate: { _tag: 'Invisible' },
  snap: snapFromConfig(config.snap),
  lastDragPreventedAt: O.none,
  swallowNextClick: false,
  seq: 0,
  config,
})

// Effects
// ---------------------------------

const noOp = <Item>(cmd: Cmd<{ _tag: 'NoOp' }>): Cmd<Msg<Item>> =>
  cmd.map((m): Msg<Item> => m)

// Settle on `TransitionEnd`, or after the transition duration in case the
// `transitionend` event never fires (e.g. nothing actually moved).
const animationTimeoutCmd = <Item>(model: Model<Item>): Cmd<Msg<Item>> =>
  delayCmd<Msg<Item>>(model.config.durationMs + 50, {
    _tag: 'AnimationTimeout',
    seq: model.seq,
  })

// Start a new animation: bump `seq` so messages of the previous one are
// ignored, and schedule its timeout.
const startAnimation = <Item>(
  model: Model<Item>,
): [Model<Item>, Cmd<Msg<Item>>] => {
  const next: Model<Item> = { ...model, seq: model.seq + 1 }
  return [next, animationTimeoutCmd(next)]
}

// Handlers
// ---------------------------------

export const openHandler =
  <Item>(internal: Item) =>
  (model: Model<Item>): [Model<Item>, Cmd<Msg<Item>>] => {
    const animate = model.animate
    switch (animate._tag) {
      case 'Invisible': {
        const seq = model.seq + 1
        return [
          {
            ...model,
            animate: { _tag: 'Mounting', internal },
            snap: snapFromConfig(model.config.snap),
            seq,
          },
          Cmd.batch([
            noOp(rememberFocusCmd(model.config)),
            afterNextPaintCmd<Msg<Item>>(model.config, {
              _tag: 'MountFrame',
              seq,
            }),
          ]),
        ]
      }
      case 'AnimateOut': {
        // Reopened while closing: reverse from the current position
        const [next, cmd] = startAnimation(model)
        return [{ ...next, animate: { _tag: 'AnimateIn', internal } }, cmd]
      }
      case 'Mounting':
      case 'AnimateIn':
      case 'Visible':
      case 'Dragging':
      case 'Settling':
        // Already open: only the payload changes
        return [{ ...model, animate: { ...animate, internal } }, Cmd.none()]
    }
  }

// Fully closed: drop the payload, reset the snap point and undo the effects
// of opening.
const finishClose = <Item>(
  model: Model<Item>,
): [Model<Item>, Cmd<Msg<Item>>] => [
  {
    ...model,
    animate: { _tag: 'Invisible' },
    snap: snapFromConfig(model.config.snap),
    seq: model.seq + 1,
  },
  // The body scroll lock is held by the drawer's view while it shows it
  noOp(restoreFocusCmd(model.config)),
]

export const closeHandler = <Item>(
  model: Model<Item>,
): [Model<Item>, Cmd<Msg<Item>>] => {
  const animate = model.animate
  switch (animate._tag) {
    case 'Invisible':
    case 'AnimateOut':
      return [model, Cmd.none()]
    case 'Mounting':
      // Never became visible: nothing to animate
      return finishClose(model)
    case 'AnimateIn':
    case 'Visible':
    case 'Dragging':
    case 'Settling': {
      const [next, cmd] = startAnimation(model)
      return [
        {
          ...next,
          animate: { _tag: 'AnimateOut', internal: animate.internal },
        },
        cmd,
      ]
    }
  }
}

export const dismissHandler = <Item>(
  model: Model<Item>,
): [Model<Item>, Cmd<Msg<Item>>] => {
  if (model.config.dismissible) {
    return closeHandler(model)
  } else {
    return [model, Cmd.none()]
  }
}

// Current animation finished
const animationEndHandler = <Item>(
  model: Model<Item>,
): [Model<Item>, Cmd<Msg<Item>>] => {
  const animate = model.animate
  switch (animate._tag) {
    case 'AnimateIn':
      return [
        {
          ...model,
          animate: {
            _tag: 'Visible',
            internal: animate.internal,
            gesture: { _tag: 'Idle' },
          },
        },
        Cmd.none(),
      ]
    case 'Settling':
      // A press made while settling carries on
      return [
        {
          ...model,
          animate: {
            _tag: 'Visible',
            internal: animate.internal,
            gesture: animate.gesture,
          },
        },
        Cmd.none(),
      ]
    case 'AnimateOut':
      return finishClose(model)
    case 'Invisible':
    case 'Mounting':
    case 'Visible':
    case 'Dragging':
      return [model, Cmd.none()]
  }
}

const mountFrameHandler =
  (seq: number) =>
  <Item>(model: Model<Item>): [Model<Item>, Cmd<Msg<Item>>] => {
    const animate = model.animate
    if (animate._tag === 'Mounting' && seq === model.seq) {
      const [next, cmd] = startAnimation(model)
      return [
        { ...next, animate: { _tag: 'AnimateIn', internal: animate.internal } },
        Cmd.batch([cmd, noOp(focusContentCmd(model.config))]),
      ]
    } else {
      // Closed or reopened in the meantime
      return [model, Cmd.none()]
    }
  }

export const setSnapHandler =
  (index: number) =>
  <Item>(model: Model<Item>): [Model<Item>, Cmd<Msg<Item>>] => {
    const animate = model.animate
    return pipe(
      selectSnap(index)(model.snap),
      O.filter(() => index !== activeSnapIndex(model.snap)),
      O.fold(
        // Out of range, no snap points, or already there
        (): [Model<Item>, Cmd<Msg<Item>>] => [model, Cmd.none()],
        (snap): [Model<Item>, Cmd<Msg<Item>>] => {
          switch (animate._tag) {
            case 'AnimateIn':
            case 'Visible':
            case 'Settling': {
              const [next, cmd] = startAnimation(model)
              return [
                {
                  ...next,
                  snap,
                  animate: {
                    _tag: 'Settling',
                    internal: animate.internal,
                    gesture: { _tag: 'Idle' },
                  },
                },
                cmd,
              ]
            }
            case 'Invisible':
            case 'Mounting':
              // Not on screen yet: just pick the snap point
              return [{ ...model, snap }, Cmd.none()]
            case 'Dragging':
            case 'AnimateOut':
              // The pointer or the close animation is in control
              return [model, Cmd.none()]
          }
        },
      ),
    )
  }

export const setSnapPointsHandler =
  (points: NEA.NonEmptyArray<SnapPoint>) =>
  <Item>(model: Model<Item>): [Model<Item>, Cmd<Msg<Item>>] => {
    const animate = model.animate
    return pipe(
      replaceSnapPoints(points)(model.snap),
      // Unchanged points keep the model as is, so content that re-measures
      // on every render doesn't loop
      O.filter((snap) => !SnapEq.equals(snap, model.snap)),
      O.fold(
        // No snap points to replace, or the same ones
        (): [Model<Item>, Cmd<Msg<Item>>] => [model, Cmd.none()],
        (snap): [Model<Item>, Cmd<Msg<Item>>] => {
          const moves =
            snap._tag === 'Snap' &&
            model.snap._tag === 'Snap' &&
            !SnapPointEq.equals(snap.current.active, model.snap.current.active)
          switch (animate._tag) {
            case 'AnimateIn':
            case 'Visible':
            case 'Settling': {
              if (moves) {
                // The resting position changed: transition to it, like
                // `SetSnap`, so a press meanwhile reads the real position
                const [next, cmd] = startAnimation(model)
                return [
                  {
                    ...next,
                    snap,
                    animate: {
                      _tag: 'Settling',
                      internal: animate.internal,
                      gesture: { _tag: 'Idle' },
                    },
                  },
                  cmd,
                ]
              } else {
                return [{ ...model, snap }, Cmd.none()]
              }
            }
            case 'Mounting':
            case 'Dragging':
            case 'AnimateOut':
              // Not at rest: the next rest (or the release) uses the new points
              return [{ ...model, snap }, Cmd.none()]
            case 'Invisible':
              // Every open starts again from `config.snap`
              return [model, Cmd.none()]
          }
        },
      ),
    )
  }

// Port of vaul's handle tap: cycle to the next snap point, closing from the
// last one when dismissible.
const cycleSnapHandler = <Item>(
  model: Model<Item>,
): [Model<Item>, Cmd<Msg<Item>>] => {
  const isLast = activeSnapIndex(model.snap) === lastSnapIndex(model.snap)
  if (model.animate._tag !== 'Visible' || !hasSnapPoints(model.snap)) {
    // Ignore taps during animations and right after a drag
    return [model, Cmd.none()]
  } else if (isLast && model.config.dismissible) {
    return closeHandler(model)
  } else if (isLast) {
    return [model, Cmd.none()]
  } else {
    return setSnapHandler(activeSnapIndex(model.snap) + 1)(model)
  }
}

// Replace the gesture of a drawer at rest; any other state has none
const withGesture =
  (gesture: Gesture) =>
  <Item>(model: Model<Item>): Model<Item> => {
    const animate = model.animate
    switch (animate._tag) {
      case 'Visible':
      case 'Settling':
        return { ...model, animate: { ...animate, gesture } }
      case 'Invisible':
      case 'Mounting':
      case 'AnimateIn':
      case 'Dragging':
      case 'AnimateOut':
        return model
    }
  }

const pointerDownHandler =
  (press: Press) =>
  <Item>(model: Model<Item>): [Model<Item>, Cmd<Msg<Item>>] => {
    const canDrag = model.config.dismissible || hasSnapPoints(model.snap)
    // A new press: its click is a tap until it drags
    const pressed = { ...model, swallowNextClick: false }
    if (canDrag) {
      // Only taken by a drawer at rest (`withGesture`)
      return [
        withGesture({
          _tag: 'Pressed',
          press,
          last: { x: press.startX, y: press.startY },
        })(pressed),
        Cmd.none(),
      ]
    } else {
      // Can't be dragged
      return [pressed, Cmd.none()]
    }
  }

// The pointer moved while pressed: decide whether the gesture is a drag of
// the drawer, a scroll of the content, or a swipe across the drawer axis.
const pressedMoveHandler =
  <Item>(
    animate: Extract<AnimateState<Item>, { _tag: 'Visible' | 'Settling' }>,
    press: Press,
    move: { x: number; y: number; time: number },
    hasSelection: boolean,
  ) =>
  (model: Model<Item>): [Model<Item>, Cmd<Msg<Item>>] => {
    const config = model.config
    const dragged = draggedDistance(config.direction, press, move.x, move.y)
    const isDraggingInDirection = dragged > 0
    const last = { x: move.x, y: move.y }
    const start = gestureStart(
      config,
      press.pointerType,
      move.x - press.startX,
      move.y - press.startY,
    )

    switch (start._tag) {
      case 'Undecided':
        // Still within the noise of the press
        return [
          withGesture({ _tag: 'Pressed', press, last })(model),
          Cmd.none(),
        ]
      case 'AcrossAxis':
        // Leave the gesture to the content (e.g. a scroll) until release
        return [withGesture({ _tag: 'Idle' })(model), Cmd.none()]
      case 'AlongAxis':
        return alongAxisMoveHandler(animate, press, {
          dragged,
          isDraggingInDirection,
          last,
          time: move.time,
          hasSelection,
        })(model)
    }
  }

// The gesture runs along the drawer axis: drag the drawer, unless the
// content takes it (`decideDrag`: a scrolled list, selected text, ...)
const alongAxisMoveHandler =
  <Item>(
    animate: Extract<AnimateState<Item>, { _tag: 'Visible' | 'Settling' }>,
    press: Press,
    move: {
      dragged: number
      isDraggingInDirection: boolean
      last: PointerPosition
      time: number
      hasSelection: boolean
    },
  ) =>
  (model: Model<Item>): [Model<Item>, Cmd<Msg<Item>>] => {
    const config = model.config
    const { dragged, isDraggingInDirection, last, hasSelection } = move
    const decision = decideDrag(config, press, {
      isDraggingInDirection,
      hasSelection,
      time: move.time,
      lastDragPreventedAt: model.lastDragPreventedAt,
    })
    if (decision.allow) {
      // `Dragging` now holds the press
      return [
        {
          ...model,
          lastDragPreventedAt: decision.lastDragPreventedAt,
          animate: {
            _tag: 'Dragging',
            internal: animate.internal,
            press,
            distance: dragDistance(config, model.snap, press, dragged),
            last,
          },
        },
        Cmd.none(),
      ]
    } else {
      // Not a drag (yet): the content scrolls. Re-evaluated on the next move.
      return [
        withGesture({ _tag: 'Pressed', press, last })({
          ...model,
          lastDragPreventedAt: decision.lastDragPreventedAt,
        }),
        Cmd.none(),
      ]
    }
  }

const pointerMoveHandler =
  (move: { x: number; y: number; time: number }, hasSelection: boolean) =>
  <Item>(model: Model<Item>): [Model<Item>, Cmd<Msg<Item>>] => {
    const animate = model.animate
    switch (animate._tag) {
      case 'Dragging': {
        const dragged = draggedDistance(
          model.config.direction,
          animate.press,
          move.x,
          move.y,
        )
        return [
          {
            ...model,
            animate: {
              ...animate,
              distance: dragDistance(
                model.config,
                model.snap,
                animate.press,
                dragged,
              ),
              last: { x: move.x, y: move.y },
            },
          },
          Cmd.none(),
        ]
      }
      case 'Visible':
      case 'Settling':
        if (animate.gesture._tag === 'Pressed') {
          return pressedMoveHandler(
            animate,
            animate.gesture.press,
            move,
            hasSelection,
          )(model)
        } else {
          return [model, Cmd.none()]
        }
      case 'Invisible':
      case 'Mounting':
      case 'AnimateIn':
      case 'AnimateOut':
        return [model, Cmd.none()]
    }
  }

const releaseHandler =
  (release: { x: number; y: number; time: number }) =>
  <Item>(model: Model<Item>): [Model<Item>, Cmd<Msg<Item>>] => {
    const animate = model.animate
    if (animate._tag === 'Dragging') {
      // The release of a drag is not a tap on the element under it
      const released = { ...model, swallowNextClick: true }
      const decision = decideRelease(
        released.config,
        released.snap,
        animate.press,
        release,
      )
      switch (decision._tag) {
        case 'Close':
          return closeHandler(released)
        case 'Snap':
        case 'Reset': {
          const [next, cmd] = startAnimation(released)
          return [
            {
              ...next,
              snap:
                decision._tag === 'Snap'
                  ? pipe(
                      selectSnap(decision.index)(released.snap),
                      O.getOrElse(() => released.snap),
                    )
                  : released.snap,
              animate: {
                _tag: 'Settling',
                internal: animate.internal,
                gesture: { _tag: 'Idle' },
              },
            },
            cmd,
          ]
        }
      }
    } else {
      // A tap, or a gesture that scrolled the content
      return [withGesture({ _tag: 'Idle' })(model), Cmd.none()]
    }
  }

const pointerCancelHandler =
  (time: number) =>
  <Item>(model: Model<Item>): [Model<Item>, Cmd<Msg<Item>>] => {
    const animate = model.animate
    if (animate._tag === 'Dragging') {
      // Release where the pointer was last seen, like vaul
      return releaseHandler({ ...animate.last, time })(model)
    } else {
      return [withGesture({ _tag: 'Idle' })(model), Cmd.none()]
    }
  }

// Update
// ---------------------------------

export const update = <Item, ItemMsg>(
  msg: Msg<Item, ItemMsg>,
  model: Model<Item>,
): [Model<Item>, Cmd<Msg<Item, ItemMsg>>] => {
  switch (msg._tag) {
    case 'Open':
      return openHandler(msg.internal)(model)
    case 'ContentMsg':
      // The owner intercepts this one (`getContent` / `modifyContent`)
      return [model, Cmd.none()]
    case 'Close':
      return closeHandler(model)
    case 'Dismiss':
      return dismissHandler(model)
    case 'SetSnap':
      return setSnapHandler(msg.index)(model)
    case 'SetSnapPoints':
      return setSnapPointsHandler(msg.points)(model)
    case 'CycleSnap':
      return cycleSnapHandler(model)
    case 'MountFrame':
      return mountFrameHandler(msg.seq)(model)
    case 'TransitionEnd':
      return animationEndHandler(model)
    case 'AnimationTimeout':
      if (msg.seq === model.seq) {
        return animationEndHandler(model)
      } else {
        // Timeout of an interrupted animation
        return [model, Cmd.none()]
      }
    case 'PointerDown':
      return pointerDownHandler(msg.press)(model)
    case 'PressIgnored':
      return [{ ...model, swallowNextClick: false }, Cmd.none()]
    case 'PointerMove':
      return pointerMoveHandler(msg, msg.hasSelection)(model)
    case 'PointerUp':
      return releaseHandler(msg)(model)
    case 'PointerCancel':
      return pointerCancelHandler(msg.time)(model)
    case 'NoOp':
      return [model, Cmd.none()]
  }
}
