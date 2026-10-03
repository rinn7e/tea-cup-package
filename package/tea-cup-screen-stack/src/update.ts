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
import {
  depth,
  getScreen,
  modifyRenderedEntry,
  renderedEntry,
  setTop,
} from './util'

type Result<Item, ItemMsg> = [Model<Item>, Cmd<Msg<Item, ItemMsg>>]

// Defaults
// ---------------------------------

export const defaultConfig = <Item>(
  id: string,
  uniqueKeyField: (screen: Item) => string,
): Config<Item> => ({
  id,
  durationMs: 300,
  uniqueKeyField,
})

const newEntry = <Item>(screen: Item): Entry<Item> => ({
  screen,
  height: O.none,
})

// A stack showing `root`
export const defaultModel = <Item>(
  config: Config<Item>,
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

const noOp = <Item, ItemMsg>(
  cmd: Cmd<{ _tag: 'NoOp' }>,
): Cmd<Msg<Item, ItemMsg>> => cmd.map((m): Msg<Item, ItemMsg> => m)

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
const startTransition = <Item, ItemMsg>(
  model: Model<Item>,
): Result<Item, ItemMsg> => {
  if (model.config.durationMs <= 0) {
    const next = settle(model)
    return [next, noOp(focusTopCmd(next.config, depth(next)))]
  } else {
    const seq = model.seq + 1
    return [
      { ...model, seq },
      afterNextPaintCmd<Msg<Item, ItemMsg>>(model.config, {
        _tag: 'Frame',
        seq,
      }),
    ]
  }
}

// Handlers
// ---------------------------------

// A push or pop while sliding first finishes the running transition at once
// (`settle`), so the new one starts from a consistent state.

// Ignored when the screen's key is already in the stack (checked after
// settling, so a screen that is only sliding away doesn't count)
export const pushHandler =
  <Item>(screen: Item) =>
  <ItemMsg>(model: Model<Item>): Result<Item, ItemMsg> => {
    const current = settle(model)
    const key = current.config.uniqueKeyField(screen)
    if (O.isSome(getScreen(key)(current))) {
      return [model, Cmd.none()]
    } else {
      return startTransition({
        ...current,
        top: newEntry(screen),
        transition: { _tag: 'Pushing', previous: current.top, phase: 'Start' },
      })
    }
  }

// Back to the screen at `index` in one slide from the top: the screens in
// between are discarded without being shown (like iOS `popToRoot`)
export const popToHandler =
  (index: number) =>
  <Item, ItemMsg>(model: Model<Item>): Result<Item, ItemMsg> => {
    const current = settle(model)
    return pipe(
      A.lookup(index)(current.below),
      O.fold(
        // Not below the top
        (): Result<Item, ItemMsg> => [model, Cmd.none()],
        (target): Result<Item, ItemMsg> =>
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
export const popHandler = <Item, ItemMsg>(
  model: Model<Item>,
): Result<Item, ItemMsg> => popToHandler(depth(model) - 1)<Item, ItemMsg>(model)

// Swap the top screen without animation, even while it slides in. Its
// height is kept until the new content is measured. Ignored when the key
// belongs to another screen in the stack.
export const replaceHandler =
  <Item>(screen: Item) =>
  <ItemMsg>(model: Model<Item>): Result<Item, ItemMsg> => [
    setTop(screen)(model),
    Cmd.none(),
  ]

const frameHandler =
  (seq: number) =>
  <Item, ItemMsg>(model: Model<Item>): Result<Item, ItemMsg> => {
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
        delayCmd<Msg<Item, ItemMsg>>(model.config.durationMs + 50, {
          _tag: 'TransitionTimeout',
          seq,
        }),
      ]
    } else {
      // Frame of an interrupted transition
      return [model, Cmd.none()]
    }
  }

const transitionEndHandler = <Item, ItemMsg>(
  model: Model<Item>,
): Result<Item, ItemMsg> => {
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
  <Item, ItemMsg>(model: Model<Item>): Result<Item, ItemMsg> =>
    pipe(
      renderedEntry(index)(model),
      O.filter(
        (entry: Entry<Item>) =>
          !O.exists((known: number) => known === height)(entry.height),
      ),
      O.fold(
        // Unchanged (the same model, so nothing re-renders), or a screen
        // that is not rendered
        (): Result<Item, ItemMsg> => [model, Cmd.none()],
        (): Result<Item, ItemMsg> => [
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

export const update = <Item, ItemMsg>(
  msg: Msg<Item, ItemMsg>,
  model: Model<Item>,
): Result<Item, ItemMsg> => {
  switch (msg._tag) {
    case 'Push':
      return pushHandler(msg.screen)<ItemMsg>(model)
    case 'Pop':
      return popHandler<Item, ItemMsg>(model)
    case 'PopTo':
      return popToHandler(msg.depth)<Item, ItemMsg>(model)
    case 'Replace':
      return replaceHandler(msg.screen)<ItemMsg>(model)
    case 'ScreenMsg':
      // The parent intercepts this one (`getScreen` / `modifyScreen`)
      return [model, Cmd.none()]
    case 'Frame':
      return frameHandler(msg.seq)<Item, ItemMsg>(model)
    case 'TransitionEnd':
      return transitionEndHandler<Item, ItemMsg>(model)
    case 'TransitionTimeout':
      if (msg.seq === model.seq) {
        return transitionEndHandler<Item, ItemMsg>(model)
      } else {
        // Timeout of an interrupted transition
        return [model, Cmd.none()]
      }
    case 'HeightMeasured':
      return heightMeasuredHandler(msg.depth, msg.height)<Item, ItemMsg>(model)
    case 'NoOp':
      return [model, Cmd.none()]
  }
}
