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
import * as A from 'fp-ts/lib/Array'
import * as NEA from 'fp-ts/lib/NonEmptyArray'
import * as O from 'fp-ts/lib/Option'

import { type Stack, type Transition } from './type'

// Queries
// ---------------------------------

// The screen on show
export const getTop = <Item>(model: Stack<Item>): Item =>
  model.stack[model.stack.length - 1]

// Store the updated top screen, e.g. after routing a screen message to it.
// The rest of the stack and the transition are untouched.
export const setTop =
  <Item>(screen: Item) =>
  (model: Stack<Item>): Stack<Item> => ({
    ...model,
    stack: A.append(screen)(NEA.init(model.stack)),
  })

// Index of the screen on show (0 = the root)
export const depth = <Item>(model: Stack<Item>): number =>
  model.stack.length - 1

// Whether `Pop` does anything, e.g. to show a back button
export const canPop = <Item>(model: Stack<Item>): boolean => depth(model) > 0

export const isSliding = <Item>(transition: Transition<Item>): boolean =>
  transition._tag === 'Sliding'

// Depth of the outgoing screen while sliding: below the top on a push,
// above it (already popped) on a pop
export const fromDepth = <Item>(model: Stack<Item>): O.Option<number> => {
  const transition = model.transition
  switch (transition._tag) {
    case 'Idle':
      return O.none
    case 'Sliding':
      return O.some(transition.fromDepth)
  }
}

// Whether a screen at `index` is currently rendered (and may be measured)
export const isRenderedDepth = <Item>(
  model: Stack<Item>,
  index: number,
): boolean =>
  index === depth(model) ||
  O.exists((from: number) => from === index)(fromDepth(model))

export const getHeight = <Item>(
  model: Stack<Item>,
  index: number,
): O.Option<number> => O.fromNullable(model.heights[String(index)])

// DOM ids
// ---------------------------------

export const containerDomId = (id: string): string => `${id}-screen-stack`

export const panelDomId = (id: string, index: number): string =>
  `${id}-screen-${index}`

// Styles
// ---------------------------------

// iOS-like easing (also used by tea-cup-drawer)
export const easing = 'cubic-bezier(0.32, 0.72, 0, 1)'

// How far the screen underneath moves while the top one slides over it
// (iOS-style parallax)
export const parallaxPercent = -30

export type PanelRole = 'Top' | 'From'

// Horizontal offset (%) of a panel
export const panelOffsetPercent = <Item>(
  transition: Transition<Item>,
  role: PanelRole,
): number => {
  switch (transition._tag) {
    case 'Idle':
      return 0
    case 'Sliding': {
      const isStart = transition.phase === 'Start'
      if (transition.direction === 'Forward') {
        if (role === 'Top') {
          // Comes in from the end edge
          return isStart ? 100 : 0
        } else {
          // Moves a bit back, covered by the new screen
          return isStart ? 0 : parallaxPercent
        }
      } else {
        if (role === 'Top') {
          // Comes back from underneath
          return isStart ? parallaxPercent : 0
        } else {
          // Leaves to the end edge
          return isStart ? 0 : 100
        }
      }
    }
  }
}

// Height (px) of the container: the screen on show's, so changes of its
// content (e.g. data arriving) animate too. While sliding, it starts at the
// outgoing screen's height and animates to the incoming one's. `none` =
// natural height (a screen not measured yet, e.g. on the first render).
export const containerHeight = <Item>(model: Stack<Item>): O.Option<number> => {
  const transition = model.transition
  switch (transition._tag) {
    case 'Idle':
      return getHeight(model, depth(model))
    case 'Sliding':
      if (transition.phase === 'Start') {
        return O.chain((from: number) => getHeight(model, from))(
          fromDepth(model),
        )
      } else {
        return getHeight(model, depth(model))
      }
  }
}
