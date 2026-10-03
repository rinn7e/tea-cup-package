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
import * as NEA from 'fp-ts/lib/NonEmptyArray'
import * as O from 'fp-ts/lib/Option'

import { type Entry, type Model, type Transition } from './type'

// Queries
// ---------------------------------

// The screen on show
export const getTop = <Item>(model: Model<Item>): Item => model.top.screen

// Store the updated top screen, e.g. after routing a screen message to it.
// The rest of the stack and the transition are untouched.
export const setTop =
  <Item>(screen: Item) =>
  (model: Model<Item>): Model<Item> => ({
    ...model,
    top: { ...model.top, screen },
  })

// Index of the screen on show (0 = the root)
export const depth = <Item>(model: Model<Item>): number => {
  switch (model.transition._tag) {
    case 'Pushing':
      // `previous` sits between `below` and `top`
      return model.below.length + 1
    case 'Idle':
    case 'Popping':
      return model.below.length
  }
}

// Whether `Pop` does anything, e.g. to show a back button
export const canPop = <Item>(model: Model<Item>): boolean => depth(model) > 0

// The screens of the stack, root first (without screens being popped)
export const screens = <Item>(model: Model<Item>): Item[] => {
  const transition = model.transition
  const underTop =
    transition._tag === 'Pushing'
      ? [...model.below, transition.previous]
      : model.below
  return [...underTop, model.top].map((entry) => entry.screen)
}

// Rendered panels
// ---------------------------------

export type PanelRole = 'Top' | 'From'

export type Panel<Item> = {
  depth: number
  entry: Entry<Item>
  role: PanelRole
}

// The outgoing screen while sliding, with its depth
export const fromPanel = <Item>(model: Model<Item>): O.Option<Panel<Item>> => {
  const transition = model.transition
  switch (transition._tag) {
    case 'Idle':
      return O.none
    case 'Pushing':
      return O.some({
        depth: depth(model) - 1,
        entry: transition.previous,
        role: 'From',
      })
    case 'Popping':
      return O.some({
        depth: depth(model) + transition.popped.length,
        entry: NEA.last(transition.popped),
        role: 'From',
      })
  }
}

// The screens to render, ordered by depth: the top one, plus the outgoing
// one while sliding
export const panels = <Item>(model: Model<Item>): Panel<Item>[] => {
  const top: Panel<Item> = {
    depth: depth(model),
    entry: model.top,
    role: 'Top',
  }
  return O.fold(
    (): Panel<Item>[] => [top],
    (from: Panel<Item>) => (from.depth < top.depth ? [from, top] : [top, from]),
  )(fromPanel(model))
}

// The rendered screen at `index` (the top or the outgoing one)
export const renderedEntry =
  (index: number) =>
  <Item>(model: Model<Item>): O.Option<Entry<Item>> =>
    O.map((panel: Panel<Item>) => panel.entry)(
      O.fromNullable(panels(model).find((panel) => panel.depth === index)),
    )

// Apply `f` to the rendered screen at `index` (the top or the outgoing one);
// the same model for any other depth
export const modifyRenderedEntry =
  <Item>(index: number, f: (entry: Entry<Item>) => Entry<Item>) =>
  (model: Model<Item>): Model<Item> => {
    const transition = model.transition
    if (index === depth(model)) {
      return { ...model, top: f(model.top) }
    } else if (transition._tag === 'Pushing' && index === depth(model) - 1) {
      return {
        ...model,
        transition: { ...transition, previous: f(transition.previous) },
      }
    } else if (
      transition._tag === 'Popping' &&
      index === depth(model) + transition.popped.length
    ) {
      return {
        ...model,
        transition: {
          ...transition,
          popped: NEA.concat(
            NEA.init(transition.popped),
            NEA.of(f(NEA.last(transition.popped))),
          ),
        },
      }
    } else {
      // Not rendered
      return model
    }
  }

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

// Horizontal offset (%) of a panel
export const panelOffsetPercent = <Item>(
  transition: Transition<Item>,
  role: PanelRole,
): number => {
  switch (transition._tag) {
    case 'Idle':
      return 0
    case 'Pushing': {
      const isStart = transition.phase === 'Start'
      if (role === 'Top') {
        // Comes in from the end edge
        return isStart ? 100 : 0
      } else {
        // Moves a bit back, covered by the new screen
        return isStart ? 0 : parallaxPercent
      }
    }
    case 'Popping': {
      const isStart = transition.phase === 'Start'
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

// Height (px) of the container: the screen on show's, so changes of its
// content (e.g. data arriving) animate too. While sliding, it starts at the
// outgoing screen's height and animates to the incoming one's. `none` =
// natural height (a screen not measured yet, e.g. on the first render).
export const containerHeight = <Item>(model: Model<Item>): O.Option<number> => {
  const transition = model.transition
  switch (transition._tag) {
    case 'Idle':
      return model.top.height
    case 'Pushing':
    case 'Popping':
      if (transition.phase === 'Start') {
        return O.chain((from: Panel<Item>) => from.entry.height)(
          fromPanel(model),
        )
      } else {
        return model.top.height
      }
  }
}
