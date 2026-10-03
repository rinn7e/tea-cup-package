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
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import {
  afterNextPaintCmd,
  focusContentCmd,
  lockBodyScrollCmd,
  popLayerCmd,
  pushLayerCmd,
  unlockBodyScrollCmd,
} from './effect'
import {
  type AnimateState,
  type Config,
  type Gesture,
  type Model,
  type Msg,
  type Press,
} from './type'
import {
  activeSnapIndex,
  decideDrag,
  decideRelease,
  dragDistance,
  draggedDistance,
  hasSnapPoints,
  isDeltaInDirection,
  lastSnapIndex,
  selectSnap,
  snapFromConfig,
  swipeStartThreshold,
} from './util'

// Defaults (vaul's)
// ---------------------------------

export const defaultConfig = <Item>(
  id: string,
  uniqueKeyField: (internal: Item) => string,
): Config<Item> => ({
  id,
  uniqueKeyField,
  direction: 'bottom',
  modality: { _tag: 'Modal', lockBody: true },
  dismissible: true,
  snap: { _tag: 'NoSnap' },
  handleOnly: false,
  autoFocus: false,
  closeThreshold: 0.25,
  velocityThreshold: 0.4,
  scrollLockTimeout: 100,
  durationMs: 500,
  portal: { _tag: 'Body' },
})

export const defaultModel = <Item>(config: Config<Item>): Model<Item> => ({
  animate: { _tag: 'Invisible' },
  snap: snapFromConfig(config.snap),
  lastDragPreventedAt: O.none,
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
            noOp(pushLayerCmd(model.config)),
            noOp(lockBodyScrollCmd(model.config)),
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
  Cmd.batch([
    noOp(unlockBodyScrollCmd(model.config)),
    noOp(popLayerCmd(model.config)),
  ]),
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
    if (canDrag) {
      // Only taken by a drawer at rest (`withGesture`)
      return [
        withGesture({
          _tag: 'Pressed',
          press,
          last: { x: press.startX, y: press.startY },
        })(model),
        Cmd.none(),
      ]
    } else {
      // Can't be dragged
      return [model, Cmd.none()]
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
    const dx = move.x - press.startX
    const dy = move.y - press.startY
    const threshold = swipeStartThreshold(press.pointerType)
    const dragged = draggedDistance(config.direction, press, move.x, move.y)
    const isDraggingInDirection = dragged > 0
    const last = { x: move.x, y: move.y }

    if (!isDeltaInDirection(config.direction, dx, dy, threshold)) {
      if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
        // Swiping across the drawer axis: leave the gesture to the content
        return [withGesture({ _tag: 'Idle' })(model), Cmd.none()]
      } else {
        return [
          withGesture({ _tag: 'Pressed', press, last })(model),
          Cmd.none(),
        ]
      }
    } else {
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
      const decision = decideRelease(
        model.config,
        model.snap,
        animate.press,
        release,
      )
      switch (decision._tag) {
        case 'Close':
          return closeHandler(model)
        case 'Snap':
        case 'Reset': {
          const [next, cmd] = startAnimation(model)
          return [
            {
              ...next,
              snap:
                decision._tag === 'Snap'
                  ? pipe(
                      selectSnap(decision.index)(model.snap),
                      O.getOrElse(() => model.snap),
                    )
                  : model.snap,
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
