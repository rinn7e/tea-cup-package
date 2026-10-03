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
import { type Config, type Entry, type Model, type Msg } from './type'
import { depth, modifyRenderedEntry, renderedEntry } from './util'

// Defaults
// ---------------------------------

export const defaultConfig = (id: string): Config => ({
  id,
  durationMs: 300,
})

const newEntry = <Item>(screen: Item): Entry<Item> => ({
  screen,
  height: O.none,
})

// A stack showing `root`
export const defaultModel = <Item>(
  config: Config,
  root: Item,
): Model<Item> => ({
  below: [],
  top: newEntry(root),
  transition: { _tag: 'Idle' },
  seq: 0,
  config,
})

// Effects
// ---------------------------------

const noOp = <Item>(cmd: Cmd<{ _tag: 'NoOp' }>): Cmd<Msg<Item>> =>
  cmd.map((m): Msg<Item> => m)

// End the transition: a pushed-over screen joins the ones below, popped
// screens are dropped
const settle = <Item>(model: Model<Item>): Model<Item> => {
  const transition = model.transition
  switch (transition._tag) {
    case 'Idle':
      return model
    case 'Pushing':
      return {
        ...model,
        below: A.append(transition.previous)(model.below),
        transition: { _tag: 'Idle' },
      }
    case 'Popping':
      return { ...model, transition: { _tag: 'Idle' } }
  }
}

// The transition is set to its `Start` phase: wait for a paint before
// running it, or switch at once without animation
const startTransition = <Item>(
  model: Model<Item>,
): [Model<Item>, Cmd<Msg<Item>>] => {
  if (model.config.durationMs <= 0) {
    const next = settle(model)
    return [next, noOp(focusTopCmd(next.config, depth(next)))]
  } else {
    const seq = model.seq + 1
    return [
      { ...model, seq },
      afterNextPaintCmd<Msg<Item>>(model.config, { _tag: 'Frame', seq }),
    ]
  }
}

// Handlers
// ---------------------------------

// A push or pop while sliding first finishes the running transition at once
// (`settle`), so the new one starts from a consistent state.

export const pushHandler =
  <Item>(screen: Item) =>
  (model: Model<Item>): [Model<Item>, Cmd<Msg<Item>>] => {
    const current = settle(model)
    return startTransition({
      ...current,
      top: newEntry(screen),
      transition: { _tag: 'Pushing', previous: current.top, phase: 'Start' },
    })
  }

// Back to the screen at `index` in one slide from the top: the screens in
// between are discarded without being shown (like iOS `popToRoot`)
export const popToHandler =
  (index: number) =>
  <Item>(model: Model<Item>): [Model<Item>, Cmd<Msg<Item>>] => {
    const current = settle(model)
    return pipe(
      A.lookup(index)(current.below),
      O.fold(
        // Not below the top
        (): [Model<Item>, Cmd<Msg<Item>>] => [model, Cmd.none()],
        (target): [Model<Item>, Cmd<Msg<Item>>] =>
          startTransition({
            ...current,
            below: current.below.slice(0, index),
            top: target,
            transition: {
              _tag: 'Popping',
              // The screens above the target, the old top last
              popped: NEA.concat(
                current.below.slice(index + 1),
                NEA.of(current.top),
              ),
              phase: 'Start',
            },
          }),
      ),
    )
  }

// Back to the screen below (ignored on the root)
export const popHandler = <Item>(
  model: Model<Item>,
): [Model<Item>, Cmd<Msg<Item>>] => popToHandler(depth(model) - 1)(model)

// Swap the top screen without animation, even while it slides in. Its
// height is kept until the new content is measured.
export const replaceHandler =
  <Item>(screen: Item) =>
  (model: Model<Item>): [Model<Item>, Cmd<Msg<Item>>] => [
    { ...model, top: { ...model.top, screen } },
    Cmd.none(),
  ]

const frameHandler =
  (seq: number) =>
  <Item>(model: Model<Item>): [Model<Item>, Cmd<Msg<Item>>] => {
    const transition = model.transition
    if (
      seq === model.seq &&
      transition._tag !== 'Idle' &&
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
  model: Model<Item>,
): [Model<Item>, Cmd<Msg<Item>>] => {
  const transition = model.transition
  if (transition._tag !== 'Idle' && transition.phase === 'Run') {
    const next = settle(model)
    return [next, noOp(focusTopCmd(next.config, depth(next)))]
  } else {
    // Not running (already settled by the timeout, or still at the start)
    return [model, Cmd.none()]
  }
}

const heightMeasuredHandler =
  (index: number, height: number) =>
  <Item>(model: Model<Item>): [Model<Item>, Cmd<Msg<Item>>] =>
    pipe(
      renderedEntry(index)(model),
      O.filter(
        (entry: Entry<Item>) =>
          !O.exists((known: number) => known === height)(entry.height),
      ),
      O.fold(
        // Unchanged (the same model, so nothing re-renders), or a screen
        // that is not rendered
        (): [Model<Item>, Cmd<Msg<Item>>] => [model, Cmd.none()],
        (): [Model<Item>, Cmd<Msg<Item>>] => [
          modifyRenderedEntry(index, (entry: Entry<Item>) => ({
            ...entry,
            height: O.some(height),
          }))(model),
          Cmd.none(),
        ],
      ),
    )

// Update
// ---------------------------------

export const update = <Item>(
  msg: Msg<Item>,
  model: Model<Item>,
): [Model<Item>, Cmd<Msg<Item>>] => {
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
