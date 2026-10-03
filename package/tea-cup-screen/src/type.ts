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
import * as R from 'fp-ts/lib/Record'
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

// Transition
// ---------------------------------

// Which way the screens move: `Forward` slides the new screen in from the
// end edge (push), `Back` slides the outgoing screen out to it (pop).
export type Direction = 'Forward' | 'Back'

// `Start`: both screens are rendered at their start positions without a CSS
// transition, waiting one paint. `Run`: switched to their end positions, so
// the CSS transition runs.
export type Phase = 'Start' | 'Run'

// The switch between two screens. `from` is the outgoing screen, kept until
// it has slid away (a popped screen is already removed from the stack), so
// the view renders the same way for a push and a pop. `fromDepth` is its
// index: one below the top on a push, any depth above it on a pop (popping
// several screens at once slides straight from the old top).
//
// Idle ─Push/Pop→ Sliding Start ─(next paint)→ Sliding Run ─(transitionend)→ Idle
export type Transition<Item> =
  | { _tag: 'Idle' }
  | {
      _tag: 'Sliding'
      from: Item
      fromDepth: number
      direction: Direction
      phase: Phase
    }

export const getTransitionEq = <Item>(
  itemEq: EqClass.Eq<Item>,
): EqClass.Eq<Transition<Item>> => ({
  equals: (x, y) => {
    switch (x._tag) {
      case 'Idle':
        return y._tag === 'Idle'
      case 'Sliding':
        return (
          y._tag === 'Sliding' &&
          itemEq.equals(x.from, y.from) &&
          x.fromDepth === y.fromDepth &&
          x.direction === y.direction &&
          x.phase === y.phase
        )
    }
  },
})

// Model
// ---------------------------------

// A history of screens; the last one is on show. `Item` is the user's own
// union of screens (e.g. `MenuScreen`), each case may carry a TEA model.
export type Stack<Item> = {
  stack: NonEmptyArray<Item>
  transition: Transition<Item>
  // Measured height (px) of each rendered screen, keyed by its depth (index
  // in `stack`). Used to animate the container height; unknown until the
  // screen's first measurement.
  heights: Record<string, number>
  // Incremented whenever an animation starts, so frame and timeout messages
  // of an interrupted animation are ignored
  seq: number
  config: Config
}

export const getStackEq = <Item>(
  itemEq: EqClass.Eq<Item>,
): EqClass.Eq<Stack<Item>> =>
  EqClass.struct<Stack<Item>>({
    stack: A.getEq(itemEq),
    transition: getTransitionEq(itemEq),
    heights: R.getEq(N.Eq),
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
  | { _tag: 'HeightMeasured'; depth: number; height: number }
  | { _tag: 'NoOp' }

// View
// ---------------------------------

// `renderScreen` must only use its arguments, the stack's own `model` and
// stable values like `dispatch`: anything else it closes over is invisible
// to `ScreenStackMemo`. Pass parent-owned state through `parent`.
export type Props<Item, Parent> = {
  model: Stack<Item>
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
    model: getStackEq(itemEq),
    dispatch: EqAlways,
    renderScreen: EqAlways,
    itemEq: EqAlways,
    parent: parentEq,
    parentEq: EqAlways,
    className: UndefinableEq(S.Eq),
  })
