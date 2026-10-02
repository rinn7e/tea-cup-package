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
import { Cmd } from 'tea-cup-fp'

import {
  afterNextPaintCmd,
  focusContentCmd,
  lockBodyScrollCmd,
  rememberFocusCmd,
  restoreFocusCmd,
  unlockBodyScrollCmd,
} from './effect'
import { type Config, type Model, type Msg, type Press } from './type'
import {
  decideDrag,
  decideRelease,
  dragDistance,
  draggedDistance,
  hasSnapPoints,
  isDeltaInDirection,
  lastSnapIndex,
  swipeStartThreshold,
} from './util'

// Defaults (vaul's)
// ---------------------------------

export const defaultConfig = (id: string): Config => ({
  id,
  direction: 'bottom',
  modal: true,
  dismissible: true,
  snapPoints: [],
  initialSnap: 0,
  fadeFromIndex: O.none,
  snapToSequentialPoint: false,
  handleOnly: false,
  autoFocus: false,
  closeThreshold: 0.25,
  velocityThreshold: 0.4,
  scrollLockTimeout: 100,
  durationMs: 500,
  noBodyStyles: false,
  portal: { _tag: 'Body' },
})

export const defaultModel = <A>(config: Config): Model<A> => ({
  animate: { _tag: 'Invisible' },
  gesture: { _tag: 'Idle' },
  activeSnap: config.initialSnap,
  lastDragPreventedAt: O.none,
  seq: 0,
  config,
})

// Effects
// ---------------------------------

const noOp = <A>(cmd: Cmd<{ _tag: 'NoOp' }>): Cmd<Msg<A>> =>
  cmd.map((m): Msg<A> => m)

// Settle on `TransitionEnd`, or after the transition duration in case the
// `transitionend` event never fires (e.g. nothing actually moved).
const animationTimeoutCmd = <A>(model: Model<A>): Cmd<Msg<A>> =>
  delayCmd<Msg<A>>(model.config.durationMs + 50, {
    _tag: 'AnimationTimeout',
    seq: model.seq,
  })

// Start a new animation: bump `seq` so messages of the previous one are
// ignored, and schedule its timeout.
const startAnimation = <A>(model: Model<A>): [Model<A>, Cmd<Msg<A>>] => {
  const next: Model<A> = {
    ...model,
    seq: model.seq + 1,
    gesture: { _tag: 'Idle' },
  }
  return [next, animationTimeoutCmd(next)]
}

// Handlers
// ---------------------------------

export const openHandler =
  <A>(internal: A) =>
  (model: Model<A>): [Model<A>, Cmd<Msg<A>>] => {
    const animate = model.animate
    switch (animate._tag) {
      case 'Invisible': {
        const seq = model.seq + 1
        return [
          {
            ...model,
            animate: { _tag: 'Mounting', internal },
            activeSnap: model.config.initialSnap,
            seq,
          },
          Cmd.batch([
            noOp(rememberFocusCmd(model.config)),
            noOp(lockBodyScrollCmd(model.config)),
            afterNextPaintCmd<Msg<A>>(model.config, {
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
const finishClose = <A>(model: Model<A>): [Model<A>, Cmd<Msg<A>>] => [
  {
    ...model,
    animate: { _tag: 'Invisible' },
    gesture: { _tag: 'Idle' },
    activeSnap: model.config.initialSnap,
    seq: model.seq + 1,
  },
  Cmd.batch([
    noOp(unlockBodyScrollCmd(model.config)),
    noOp(restoreFocusCmd(model.config)),
  ]),
]

export const closeHandler = <A>(model: Model<A>): [Model<A>, Cmd<Msg<A>>] => {
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

export const dismissHandler = <A>(model: Model<A>): [Model<A>, Cmd<Msg<A>>] => {
  if (model.config.dismissible) {
    return closeHandler(model)
  } else {
    return [model, Cmd.none()]
  }
}

// Current animation finished
const animationEndHandler = <A>(model: Model<A>): [Model<A>, Cmd<Msg<A>>] => {
  const animate = model.animate
  switch (animate._tag) {
    case 'AnimateIn':
    case 'Settling':
      return [
        { ...model, animate: { _tag: 'Visible', internal: animate.internal } },
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
  <A>(model: Model<A>): [Model<A>, Cmd<Msg<A>>] => {
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
  <A>(model: Model<A>): [Model<A>, Cmd<Msg<A>>] => {
    const animate = model.animate
    const isValid = index >= 0 && index <= lastSnapIndex(model.config)
    if (!isValid || index === model.activeSnap) {
      return [model, Cmd.none()]
    } else {
      switch (animate._tag) {
        case 'AnimateIn':
        case 'Visible':
        case 'Settling': {
          const [next, cmd] = startAnimation(model)
          return [
            {
              ...next,
              activeSnap: index,
              animate: { _tag: 'Settling', internal: animate.internal },
            },
            cmd,
          ]
        }
        case 'Invisible':
        case 'Mounting':
          // Not on screen yet: just pick the snap point
          return [{ ...model, activeSnap: index }, Cmd.none()]
        case 'Dragging':
        case 'AnimateOut':
          // The pointer or the close animation is in control
          return [model, Cmd.none()]
      }
    }
  }

// Port of vaul's handle tap: cycle to the next snap point, closing from the
// last one when dismissible.
const cycleSnapHandler = <A>(model: Model<A>): [Model<A>, Cmd<Msg<A>>] => {
  const isLast = model.activeSnap === lastSnapIndex(model.config)
  if (model.animate._tag !== 'Visible' || !hasSnapPoints(model.config)) {
    // Ignore taps during animations and right after a drag
    return [model, Cmd.none()]
  } else if (isLast && model.config.dismissible) {
    return closeHandler(model)
  } else if (isLast) {
    return [model, Cmd.none()]
  } else {
    return setSnapHandler(model.activeSnap + 1)(model)
  }
}

const pointerDownHandler =
  (press: Press) =>
  <A>(model: Model<A>): [Model<A>, Cmd<Msg<A>>] => {
    const canDrag = model.config.dismissible || hasSnapPoints(model.config)
    const isAtRest =
      model.animate._tag === 'Visible' || model.animate._tag === 'Settling'
    if (canDrag && isAtRest) {
      return [
        {
          ...model,
          gesture: {
            _tag: 'Pressed',
            press,
            last: { x: press.startX, y: press.startY },
          },
        },
        Cmd.none(),
      ]
    } else {
      // Can't be dragged, or still animating in / out
      return [model, Cmd.none()]
    }
  }

// The pointer moved while pressed: decide whether the gesture is a drag of
// the drawer, a scroll of the content, or a swipe across the drawer axis.
const pressedMoveHandler =
  (press: Press, move: { x: number; y: number; time: number }) =>
  (hasSelection: boolean) =>
  <A>(model: Model<A>): [Model<A>, Cmd<Msg<A>>] => {
    const config = model.config
    const animate = model.animate
    const dx = move.x - press.startX
    const dy = move.y - press.startY
    const threshold = swipeStartThreshold(press.pointerType)
    const dragged = draggedDistance(config.direction, press, move.x, move.y)
    const isDraggingInDirection = dragged > 0
    const last = { x: move.x, y: move.y }

    if (!isDeltaInDirection(config.direction, dx, dy, threshold)) {
      if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
        // Swiping across the drawer axis: leave the gesture to the content
        return [{ ...model, gesture: { _tag: 'Idle' } }, Cmd.none()]
      } else {
        return [
          { ...model, gesture: { _tag: 'Pressed', press, last } },
          Cmd.none(),
        ]
      }
    } else if (animate._tag === 'Visible' || animate._tag === 'Settling') {
      const decision = decideDrag(config, press, {
        isDraggingInDirection,
        hasSelection,
        time: move.time,
        lastDragPreventedAt: model.lastDragPreventedAt,
      })
      if (decision.allow) {
        return [
          {
            ...model,
            gesture: { _tag: 'Idle' },
            lastDragPreventedAt: decision.lastDragPreventedAt,
            animate: {
              _tag: 'Dragging',
              internal: animate.internal,
              press,
              distance: dragDistance(config, press, dragged),
              last,
            },
          },
          Cmd.none(),
        ]
      } else {
        // Not a drag (yet): the content scrolls. Re-evaluated on the next move.
        return [
          {
            ...model,
            gesture: { _tag: 'Pressed', press, last },
            lastDragPreventedAt: decision.lastDragPreventedAt,
          },
          Cmd.none(),
        ]
      }
    } else {
      // Started closing in the meantime
      return [{ ...model, gesture: { _tag: 'Idle' } }, Cmd.none()]
    }
  }

const pointerMoveHandler =
  (move: { x: number; y: number; time: number }, hasSelection: boolean) =>
  <A>(model: Model<A>): [Model<A>, Cmd<Msg<A>>] => {
    const animate = model.animate
    const gesture = model.gesture
    if (animate._tag === 'Dragging') {
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
            distance: dragDistance(model.config, animate.press, dragged),
            last: { x: move.x, y: move.y },
          },
        },
        Cmd.none(),
      ]
    } else if (gesture._tag === 'Pressed') {
      return pressedMoveHandler(gesture.press, move)(hasSelection)(model)
    } else {
      return [model, Cmd.none()]
    }
  }

const releaseHandler =
  (release: { x: number; y: number; time: number }) =>
  <A>(model: Model<A>): [Model<A>, Cmd<Msg<A>>] => {
    const animate = model.animate
    if (animate._tag === 'Dragging') {
      const decision = decideRelease(
        model.config,
        model.activeSnap,
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
              activeSnap:
                decision._tag === 'Snap' ? decision.index : model.activeSnap,
              animate: { _tag: 'Settling', internal: animate.internal },
            },
            cmd,
          ]
        }
      }
    } else {
      // A tap, or a gesture that scrolled the content
      return [{ ...model, gesture: { _tag: 'Idle' } }, Cmd.none()]
    }
  }

const pointerCancelHandler =
  (time: number) =>
  <A>(model: Model<A>): [Model<A>, Cmd<Msg<A>>] => {
    const animate = model.animate
    if (animate._tag === 'Dragging') {
      // Release where the pointer was last seen, like vaul
      return releaseHandler({ ...animate.last, time })(model)
    } else {
      return [{ ...model, gesture: { _tag: 'Idle' } }, Cmd.none()]
    }
  }

// Update
// ---------------------------------

export const update = <A>(
  msg: Msg<A>,
  model: Model<A>,
): [Model<A>, Cmd<Msg<A>>] => {
  switch (msg._tag) {
    case 'Open':
      return openHandler(msg.internal)(model)
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
