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
import * as SUA from '@rinn7e/tea-cup-prelude/type/sorted-unique-array'
import * as Ord from 'fp-ts/lib/Ord'
import { pipe } from 'fp-ts/lib/function'
import * as N from 'fp-ts/lib/number'
import { Cmd, Sub } from 'tea-cup-fp'
import { describe, expect, it } from 'vitest'

import {
  type LogicConfig,
  type Model,
  type Msg,
  defaultMode,
  mkRefs,
  subscriptions,
} from '../src'

type Item = { id: string; ts: number }
type ItemMsg = { _tag: 'Tick'; id: string }

// An item's subscription that sends `Tick` when the test fires it.
class TickSub extends Sub<ItemMsg> {
  static all: TickSub[] = []
  constructor(readonly id: string) {
    super()
    TickSub.all.push(this)
  }
  fire() {
    this.dispatch({ _tag: 'Tick', id: this.id })
  }
}

const ord: Ord.Ord<Item> = pipe(
  N.Ord,
  Ord.contramap((item: Item) => item.ts),
)

const logic: LogicConfig<Item, null, ItemMsg> = {
  refs: mkRefs(),
  mode: defaultMode<Item>(),
  isReversed: true,
  eqWithKey: { equals: (first, second) => first.id === second.id },
  ord,
  uniqueKeyField: (item) => item.id,
  visibleStrategy: { _tag: 'FullInView' },
  update: (_parent, _msg, item) => [item, Cmd.none(), { _tag: 'NoChange' }],
  subscriptions: (item) => new TickSub(item.id),
}

const model: Model<Item> = {
  mode: {
    ...defaultMode<Item>(),
    dataSourceId: 'test',
    overallData: SUA.fromArray(
      logic.eqWithKey,
      ord,
    )([
      { id: 'i1', ts: 1 },
      { id: 'i2', ts: 2 },
    ]),
  },
  containerChangeEvent: { _tag: 'NoChange' },
  // Keeps the load-more IntersectionObservers out of the node environment,
  // and shows the items keep their subscriptions while scrolling.
  invisWhileScrolling: true,
  isScrolling: false,
  savedScrollPos: null,
  initialScrollDone: true,
}

describe('subscriptions', () => {
  it("routes each item's subscription to it as a ChildMsg", () => {
    TickSub.all = []
    const sent: Msg<Item, ItemMsg, null>[] = []
    const sub = subscriptions<Item, ItemMsg, null, null>(model, logic)
    sub.init((msg) => sent.push(msg))

    expect(TickSub.all.map((s) => s.id).sort()).toEqual(['i1', 'i2'])
    TickSub.all.find((s) => s.id === 'i2')?.fire()
    expect(sent).toEqual([
      { _tag: 'ChildMsg', childId: 'i2', subMsg: { _tag: 'Tick', id: 'i2' } },
    ])
    sub.release()
  })
})
