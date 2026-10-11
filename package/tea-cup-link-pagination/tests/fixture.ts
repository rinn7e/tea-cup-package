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
import * as E from 'fp-ts/lib/Either'
import * as Ord from 'fp-ts/lib/Ord'
import * as N from 'fp-ts/lib/number'

import {
  type InitialEndpointResponse,
  type LogicConfig,
  type Model,
  defaultMode,
  mkRefs,
} from '../src/type'

// A list item: an id, and when it was sent (higher is newer).
export type Item = { id: string; at: number }

export const item = (id: string, at: number): Item => ({ id, at })

export const dataSourceId = 'test-list'

// A reversed list, newest first, like a chat timeline.
export const mkConfig = (): LogicConfig<Item, null, never> =>
  ({
    refs: mkRefs(),
    isReversed: true,
    ord: Ord.reverse(Ord.contramap((i: Item) => i.at)(N.Ord)),
    uniqueKeyField: (i: Item) => i.id,
    visibleStrategy: { _tag: 'HalfInView' },
    update: (_parent: null, _msg: never, i: Item) => [
      i,
      null,
      { _tag: 'NoChange' },
    ],
    subscriptions: () => null,
  }) as unknown as LogicConfig<Item, null, never>

// A model as `init` builds it for a list opening at `selectedKey` (null for
// the newest page): no data yet, its one scroll owed.
export const openingModel = (selectedKey: string | null): Model<Item> => ({
  mode: {
    ...defaultMode<Item>(),
    dataSourceId,
    selectedKey,
    initial: { _tag: 'Loading' },
  },
  pendingChange: { _tag: 'None' },
  invisWhileScrolling: false,
  isScrolling: false,
  initialScroll: { _tag: 'Pending' },
})

// The scroll container, as far as the list reads it.
export const fakeContainer = (scrollTop: number, scrollHeight: number) =>
  ({ scrollTop, scrollHeight }) as unknown as HTMLDivElement

export const okResponse = (
  data: Item[],
  selectedKey?: string | null,
): E.Either<never, InitialEndpointResponse<Item>> =>
  E.right({
    dataF: () => data,
    nextIsMax: true,
    ...(selectedKey === undefined ? {} : { selectedKey }),
  })

// A scroll that hides the list while it runs (`scrollToCurrentHandler`).
export const scrolledHidden = (m: Model<Item>) => m.invisWhileScrolling

// A scroll that doesn't hide the list only marks it as scrolling.
export const scrolledGracefully = (m: Model<Item>) =>
  !m.invisWhileScrolling && m.isScrolling

// The scroll shows the list again and the scrolling ends before the next step.
export const settled = (m: Model<Item>): Model<Item> => ({
  ...m,
  invisWhileScrolling: false,
  isScrolling: false,
})
