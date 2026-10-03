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
import * as A from 'fp-ts/lib/Array'
import * as NEA from 'fp-ts/lib/NonEmptyArray'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import { afterNextPaintCmd, focusTopCmd } from './effect'
import { type Config, type Direction, type Msg, type Stack } from './type'
import { depth, getTop, isRenderedDepth, setTop } from './util'

// Defaults
// ---------------------------------

export const defaultConfig = (id: string): Config => ({
  id,
  durationMs: 300,
})

// A stack showing `root`
export const defaultModel = <Item>(
  config: Config,
  root: Item,
): Stack<Item> => ({
  stack: [root],
  transition: { _tag: 'Idle' },
  heights: {},
  seq: 0,
  config,
})

// Effects
// ---------------------------------

const noOp = <Item>(cmd: Cmd<{ _tag: 'NoOp' }>): Cmd<Msg<Item>> =>
  cmd.map((m): Msg<Item> => m)

// Keep only the heights of screens still in the stack
const pruneHeights = (
  heights: Record<string, number>,
  maxDepth: number,
): Record<string, number> =>
  Object.fromEntries(
    Object.entries(heights).filter(([key]) => Number(key) <= maxDepth),
  )

// End the transition: the outgoing screen is dropped
const settle = <Item>(model: Stack<Item>): Stack<Item> => ({
  ...model,
  transition: { _tag: 'Idle' },
  heights: pruneHeights(model.heights, depth(model)),
})

// Push / Pop while sliding: jump to the end of the running transition, so
// the new one starts from a consistent state
const finishInstantly = <Item>(model: Stack<Item>): Stack<Item> => {
  switch (model.transition._tag) {
    case 'Idle':
      return model
    case 'Sliding':
      return settle(model)
  }
}

// Start sliding from `from` to the (already updated) top screen
const startSlide = <Item>(
  model: Stack<Item>,
  from: Item,
  fromDepth: number,
  direction: Direction,
): [Stack<Item>, Cmd<Msg<Item>>] => {
  if (model.config.durationMs <= 0) {
    // No animation: switch at once
    return [settle(model), noOp(focusTopCmd(model.config, depth(model)))]
  } else {
    const seq = model.seq + 1
    return [
      {
        ...model,
        transition: {
          _tag: 'Sliding',
          from,
          fromDepth,
          direction,
          phase: 'Start',
        },
        seq,
      },
      afterNextPaintCmd<Msg<Item>>(model.config, { _tag: 'Frame', seq }),
    ]
  }
}

// Handlers
// ---------------------------------

export const pushHandler =
  <Item>(screen: Item) =>
  (model: Stack<Item>): [Stack<Item>, Cmd<Msg<Item>>] => {
    const current = finishInstantly(model)
    const from = getTop(current)
    const next: Stack<Item> = {
      ...current,
      stack: A.append(screen)(current.stack),
    }
    return startSlide(next, from, depth(current), 'Forward')
  }

// Back to the screen at `index` in one slide from the top: the screens in
// between are discarded without being shown (like iOS `popToRoot`)
export const popToHandler =
  (index: number) =>
  <Item>(model: Stack<Item>): [Stack<Item>, Cmd<Msg<Item>>] => {
    if (index >= 0 && index < depth(model)) {
      const current = finishInstantly(model)
      const from = getTop(current)
      const next: Stack<Item> = {
        ...current,
        stack: pipe(
          NEA.fromArray(current.stack.slice(0, index + 1)),
          // Not reached: `index >= 0` keeps at least the root
          O.getOrElse(() => current.stack),
        ),
      }
      return startSlide(next, from, depth(current), 'Back')
    } else {
      // Already there (or above the top), or not a depth
      return [model, Cmd.none()]
    }
  }

// Back to the screen below (ignored on the root)
export const popHandler = <Item>(
  model: Stack<Item>,
): [Stack<Item>, Cmd<Msg<Item>>] => popToHandler(depth(model) - 1)(model)

// Swap the top screen without animation, even while it slides in
export const replaceHandler =
  <Item>(screen: Item) =>
  (model: Stack<Item>): [Stack<Item>, Cmd<Msg<Item>>] => [
    setTop(screen)(model),
    Cmd.none(),
  ]

const frameHandler =
  (seq: number) =>
  <Item>(model: Stack<Item>): [Stack<Item>, Cmd<Msg<Item>>] => {
    const transition = model.transition
    if (
      seq === model.seq &&
      transition._tag === 'Sliding' &&
      transition.phase === 'Start'
    ) {
      return [
        { ...model, transition: { ...transition, phase: 'Run' } },
        // Settle after the transition in case `transitionend` never fires
        // (e.g. a hidden tab, or nothing actually moved)
        delayCmd<Msg<Item>>(model.config.durationMs + 50, {
          _tag: 'TransitionTimeout',
          seq,
        }),
      ]
    } else {
      // Frame of an interrupted transition
      return [model, Cmd.none()]
    }
  }

const transitionEndHandler = <Item>(
  model: Stack<Item>,
): [Stack<Item>, Cmd<Msg<Item>>] => {
  const transition = model.transition
  if (transition._tag === 'Sliding' && transition.phase === 'Run') {
    return [settle(model), noOp(focusTopCmd(model.config, depth(model)))]
  } else {
    // Not running (already settled by the timeout, or still at the start)
    return [model, Cmd.none()]
  }
}

const heightMeasuredHandler =
  (index: number, height: number) =>
  <Item>(model: Stack<Item>): [Stack<Item>, Cmd<Msg<Item>>] => {
    if (
      isRenderedDepth(model, index) &&
      model.heights[String(index)] !== height
    ) {
      return [
        { ...model, heights: { ...model.heights, [String(index)]: height } },
        Cmd.none(),
      ]
    } else {
      // Unchanged (the same model, so nothing re-renders), or a screen that
      // is gone
      return [model, Cmd.none()]
    }
  }

// Update
// ---------------------------------

export const update = <Item>(
  msg: Msg<Item>,
  model: Stack<Item>,
): [Stack<Item>, Cmd<Msg<Item>>] => {
  switch (msg._tag) {
    case 'Push':
      return pushHandler(msg.screen)(model)
    case 'Pop':
      return popHandler(model)
    case 'PopTo':
      return popToHandler(msg.depth)(model)
    case 'Replace':
      return replaceHandler(msg.screen)(model)
    case 'Frame':
      return frameHandler(msg.seq)(model)
    case 'TransitionEnd':
      return transitionEndHandler(model)
    case 'TransitionTimeout':
      if (msg.seq === model.seq) {
        return transitionEndHandler(model)
      } else {
        // Timeout of an interrupted transition
        return [model, Cmd.none()]
      }
    case 'HeightMeasured':
      return heightMeasuredHandler(msg.depth, msg.height)(model)
    case 'NoOp':
      return [model, Cmd.none()]
  }
}
