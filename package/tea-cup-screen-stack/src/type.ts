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
import * as NEA from 'fp-ts/lib/NonEmptyArray'
import * as O from 'fp-ts/lib/Option'
import * as N from 'fp-ts/lib/number'
import * as S from 'fp-ts/lib/string'
import { type ReactNode } from 'react'
import { type Dispatcher } from 'tea-cup-fp'

// Config
// ---------------------------------

export type Config = {
  // Unique id, used to derive DOM ids
  id: string
  // Duration (ms) of the slide and height transitions. Pass 0 to switch
  // screens without animation (e.g. for `prefers-reduced-motion`).
  durationMs: number
}

export const ConfigEq: EqClass.Eq<Config> = EqAlways

// Entry
// ---------------------------------

// A screen and its last measured height (px), used to animate the container
// height. The height lives and dies with its screen; `none` until the
// screen's first measurement.
export type Entry<Item> = {
  screen: Item
  height: O.Option<number>
}

export const getEntryEq = <Item>(
  itemEq: EqClass.Eq<Item>,
): EqClass.Eq<Entry<Item>> =>
  EqClass.struct<Entry<Item>>({
    screen: itemEq,
    height: O.getEq(N.Eq),
  })

// Transition
// ---------------------------------

// `Start`: both screens are rendered at their start positions without a CSS
// transition, waiting one paint. `Run`: switched to their end positions, so
// the CSS transition runs.
export type Phase = 'Start' | 'Run'

// The screens in flight live in the transition, so they exist in exactly
// one place and their depths follow from the structure:
// - `Pushing`: `previous` (the old top, at depth `depth - 1`) slides back
//   while `top` slides in; it joins `below` once done.
// - `Popping`: the popped screens (last = the one that was on show, at depth
//   `depth + popped.length`) slide away; dropped once done. Several screens
//   are popped at once by `PopTo`, in one slide from the old top.
//
// Idle ─Push→ Pushing Start ─(next paint)→ Pushing Run ─(transitionend)→ Idle
// Idle ─Pop─→ Popping Start ─(next paint)→ Popping Run ─(transitionend)→ Idle
export type Transition<Item> =
  | { _tag: 'Idle' }
  | { _tag: 'Pushing'; previous: Entry<Item>; phase: Phase }
  | { _tag: 'Popping'; popped: NEA.NonEmptyArray<Entry<Item>>; phase: Phase }

export const getTransitionEq = <Item>(
  itemEq: EqClass.Eq<Item>,
): EqClass.Eq<Transition<Item>> => {
  const entryEq = getEntryEq(itemEq)
  return {
    equals: (x, y) => {
      switch (x._tag) {
        case 'Idle':
          return y._tag === 'Idle'
        case 'Pushing':
          return (
            y._tag === 'Pushing' &&
            entryEq.equals(x.previous, y.previous) &&
            x.phase === y.phase
          )
        case 'Popping':
          return (
            y._tag === 'Popping' &&
            NEA.getEq(entryEq).equals(x.popped, y.popped) &&
            x.phase === y.phase
          )
      }
    },
  }
}

// Model
// ---------------------------------

// A history of screens; `top` is on show. `Item` is the user's own union of
// screens (e.g. `MenuScreen`), each case may carry a TEA model.
export type Model<Item> = {
  // Screens underneath, root first (while pushing, underneath `previous`)
  below: Entry<Item>[]
  top: Entry<Item>
  transition: Transition<Item>
  // Incremented whenever an animation starts, so frame and timeout messages
  // of an interrupted animation are ignored
  seq: number
  config: Config
}

export const getModelEq = <Item>(
  itemEq: EqClass.Eq<Item>,
): EqClass.Eq<Model<Item>> =>
  EqClass.struct<Model<Item>>({
    below: A.getEq(getEntryEq(itemEq)),
    top: getEntryEq(itemEq),
    transition: getTransitionEq(itemEq),
    seq: N.Eq,
    config: ConfigEq,
  })

// Msg
// ---------------------------------

export type Msg<Item> =
  // Slide a new screen in on top
  | { _tag: 'Push'; screen: Item }
  // Slide the top screen away, back to the one below (ignored on the root)
  | { _tag: 'Pop' }
  // Go back to the screen at `depth` (0 = the root) in one slide, discarding
  // the screens above it (ignored unless below the top)
  | { _tag: 'PopTo'; depth: number }
  // Swap the top screen without animation
  | { _tag: 'Replace'; screen: Item }
  // The start positions were painted
  | { _tag: 'Frame'; seq: number }
  // The incoming screen's own transform transition finished
  | { _tag: 'TransitionEnd' }
  // Fallback for a `transitionend` that never fires
  | { _tag: 'TransitionTimeout'; seq: number }
  // Reported by the view for a rendered screen (ignored for any other depth)
  | { _tag: 'HeightMeasured'; depth: number; height: number }
  | { _tag: 'NoOp' }

// View
// ---------------------------------

// `renderScreen` must only use its arguments, the stack's own `model` and
// stable values like `dispatch`: anything else it closes over is invisible
// to `ScreenStackMemo`. Pass parent-owned state through `parent`.
export type Props<Item, Parent> = {
  model: Model<Item>
  dispatch: Dispatcher<Msg<Item>>
  // `depth` is the screen's index in the stack (0 = the root), e.g. to show
  // a back button when it is above 0. Give each screen an opaque
  // background: the incoming screen slides over the outgoing one.
  renderScreen: (screen: Item, depth: number, parent: Parent) => ReactNode
  itemEq: EqClass.Eq<Item>
  parent: Parent
  parentEq: EqClass.Eq<Parent>
  className?: string
}

export const getPropsEq = <Item, Parent>(
  itemEq: EqClass.Eq<Item>,
  parentEq: EqClass.Eq<Parent>,
): EqClass.Eq<Props<Item, Parent>> =>
  EqClass.struct<Props<Item, Parent>>({
    model: getModelEq(itemEq),
    dispatch: EqAlways,
    renderScreen: EqAlways,
    itemEq: EqAlways,
    parent: parentEq,
    parentEq: EqAlways,
    className: UndefinableEq(S.Eq),
  })
