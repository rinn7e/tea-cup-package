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
// A page of older or newer items that arrives while the reader moves the list
// (from their scroll input until the list comes to rest) waits, and goes in
// once the list is at rest (`Model.heldPages`). Because of iOS: rows added
// above a list moved by a finger or a fling need the position moved, which
// iOS doesn't allow then, so they would wait out of reach above the old first
// row and the reader would bounce at it with blank space above.
import * as SUA from '@rinn7e/tea-cup-prelude/type/sorted-unique-array'
import * as ScrollContainer from '@rinn7e/tea-cup-scroll-container'
import * as E from 'fp-ts/lib/Either'
import * as S from 'fp-ts/lib/string'
import { describe, expect, it } from 'vitest'

import {
  type Edge,
  type LogicConfig,
  type Model,
  type Msg,
  defaultMode,
  mkRefs,
} from '../src/type'
import { update } from '../src/update'

type Item = { id: string }

const dataSourceId = 'test-list'

const eqWithKey = { equals: (a: Item, b: Item) => a.id === b.id }
const ord = {
  equals: eqWithKey.equals,
  compare: (a: Item, b: Item) => S.Ord.compare(a.id, b.id),
}

const config = {
  refs: mkRefs(),
  isReversed: true,
  ord,
  uniqueKeyField: (item: Item) => item.id,
  scrollContainer: ScrollContainer.chatConfig,
} as unknown as LogicConfig<Item, unknown, never>

const loaded = [{ id: 'b' }, { id: 'c' }]
const loading: Edge = { _tag: 'Loading' }

// A loaded list whose older page is loading
const start: Model<Item> = {
  mode: {
    ...defaultMode<Item>(),
    dataSourceId,
    initial: { _tag: 'Loaded' },
    overallData: SUA.fromArray(eqWithKey, ord)(loaded),
    prev: loading,
    next: { _tag: 'Exhausted' },
  },
  flash: null,
  initialScroll: { _tag: 'Done' },
  scrollContainer: ScrollContainer.init({ _tag: 'Free', anchor: null }),
}

const send = (msg: Msg<Item, never, never>) => (model: Model<Item>) =>
  update<Item, unknown, never, never>(true, config)(null, msg, model)[0]

const container = (subMsg: ScrollContainer.Msg): Msg<Item, never, never> => ({
  _tag: 'ScrollContainerMsg',
  subMsg,
})

const readerScrolled = container({ _tag: 'ReaderScrolled', input: 'touch' })
const settled = container({
  _tag: 'ScrollSettled',
  geometry: { scrollTop: 0, scrollHeight: 1000, clientHeight: 500 },
  anchor: { key: 'b', offset: 0 },
  atEnd: false,
  now: 0,
})

// The older page, from the API
const olderPage: Msg<Item, never, never> = {
  _tag: 'GetMorePrevDataFromApiResponse',
  dataSourceId,
  overallDataBeforeCache: loaded,
  result: E.right([{ id: 'a' }]),
}

const ids = (model: Model<Item>) =>
  model.mode.overallData.value.map((item) => item.id).sort()

describe('a page arriving while the reader moves the list', () => {
  it('waits, the end still loading', () => {
    const held = send(olderPage)(send(readerScrolled)(start))
    expect(ids(held)).toEqual(['b', 'c'])
    expect(held.mode.prev).toEqual(loading)
    expect(held.heldPages).toHaveLength(1)
  })

  it('goes in once the list comes to rest', () => {
    const rest = send(settled)(send(olderPage)(send(readerScrolled)(start)))
    expect(ids(rest)).toEqual(['a', 'b', 'c'])
    expect(rest.mode.prev).not.toEqual(loading)
    expect(rest.heldPages).toEqual([])
  })

  it('goes in at once while the list is at rest', () => {
    const atRest = send(olderPage)(send(settled)(send(readerScrolled)(start)))
    expect(ids(atRest)).toEqual(['a', 'b', 'c'])
    expect(atRest.heldPages ?? []).toEqual([])
  })
})
