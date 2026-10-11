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
// The helpers a list's owner reads and changes the items with. They compare
// items by key (`uniqueKeyField`), so two rows of one item can't both be
// kept.
import * as RD from '@devexperts/remote-data-ts'
import { msgCmd } from '@rinn7e/tea-cup-prelude'
import * as CacheData from '@rinn7e/tea-cup-prelude/type/cache-data'
import { size } from '@rinn7e/tea-cup-prelude/type/size'
import * as SUA from '@rinn7e/tea-cup-prelude/type/sorted-unique-array'
import * as E from 'fp-ts/lib/Either'
import * as O from 'fp-ts/lib/Option'
import { Cmd } from 'tea-cup-fp'
import { describe, expect, it } from 'vitest'

import {
  childMsg,
  filterMapItems,
  findBy,
  findByKey,
  first,
  getChildMsg,
  hasKey,
  initialFromPrev,
  isAtNewest,
  isEmpty,
  isInitialLoaded,
  items,
  last,
  mapItems,
  mkCacheHandler,
  noopHandler,
  removeByKey,
  removeWhere,
  updateAllChildren,
  updateByKey,
  updateChild,
  upsertItems,
} from '../src/helper'
import { type LogicConfig, type Model, defaultMode, mkRefs } from '../src/type'

// `rank` orders the list; `id` is the key
type Item = { id: string; rank: number; text: string }
type ItemMsg = { _tag: 'Ping' }

const ord = {
  equals: (a: Item, b: Item) => a.rank === b.rank,
  compare: (a: Item, b: Item) =>
    a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0,
}

const config = {
  refs: mkRefs(),
  isReversed: true,
  ord,
  uniqueKeyField: (item: Item) => item.id,
} as unknown as LogicConfig<Item, unknown, ItemMsg>

const item = (id: string, rank: number, text = ''): Item => ({ id, rank, text })

const model = (all: Item[]): Model<Item> => ({
  mode: {
    ...defaultMode<Item>(),
    initial: { _tag: 'Loaded' },
    overallData: SUA.unsafeFromArray(all),
  },
  pendingChange: { _tag: 'None' },
  invisWhileScrolling: false,
  isScrolling: false,
  initialScroll: { _tag: 'Done' },
})

const ids = (m: Model<Item>) => items(m).map((i) => i.id)

type Runnable = { execute: (d: (m: unknown) => void) => void }

// Runs a Cmd and returns what it dispatches.
const run = async (cmd: unknown): Promise<unknown[]> => {
  const out: unknown[] = []
  ;(cmd as Runnable).execute((m) => out.push(m))
  await new Promise((resolve) => setTimeout(resolve, 0))
  return out
}

const list = model([item('a', 1), item('b', 2), item('c', 3)])

describe('reading items', () => {
  it('finds them by key or by a predicate', () => {
    expect(findByKey(config, 'b')(list)).toEqual(O.some(item('b', 2)))
    expect(findByKey(config, 'z')(list)).toEqual(O.none)
    expect(findBy((i: Item) => i.rank === 3)(list)).toEqual(
      O.some(item('c', 3)),
    )
    expect(hasKey(config, 'a')(list)).toBe(true)
    expect(hasKey(config, 'z')(list)).toBe(false)
  })

  it('gives the first and the last in order', () => {
    expect(first(list)).toEqual(O.some(item('a', 1)))
    expect(last(list)).toEqual(O.some(item('c', 3)))
    expect(first(model([]))).toEqual(O.none)
  })

  it('tells the list state', () => {
    expect(isEmpty(model([]))).toBe(true)
    expect(isEmpty(list)).toBe(false)
    expect(isInitialLoaded(list)).toBe(true)
    expect(
      isInitialLoaded({
        ...list,
        mode: { ...list.mode, initial: { _tag: 'Loading' } },
      }),
    ).toBe(false)
    expect(isAtNewest(list)).toBe(false)
    expect(
      isAtNewest({
        ...list,
        mode: { ...list.mode, next: { _tag: 'Exhausted' } },
      }),
    ).toBe(true)
  })
})

describe('changing items', () => {
  it('updates one by key, and re-sorts', () => {
    const after = updateByKey(config, 'a', (i) => ({ ...i, rank: 4 }))(list)
    expect(ids(after)).toEqual(['b', 'c', 'a'])
  })

  it('keeps one row per key when a map makes two equal', () => {
    // `b` becomes a second `a`: structurally different, the same key
    const after = mapItems(config, (i) =>
      i.id === 'b' ? { ...i, id: 'a', text: 'copy' } : i,
    )(list)
    expect(ids(after)).toEqual(['a', 'c'])
  })

  it('removes by key or by a predicate', () => {
    expect(ids(removeByKey(config, 'b')(list))).toEqual(['a', 'c'])
    expect(ids(removeWhere(config, (i: Item) => i.rank > 1)(list))).toEqual([
      'a',
    ])
  })

  it('filters and maps at once', () => {
    const after = filterMapItems(config, (i: Item) =>
      i.id === 'b' ? O.none : O.some({ ...i, text: 'kept' }),
    )(list)
    expect(items(after).map((i) => [i.id, i.text])).toEqual([
      ['a', 'kept'],
      ['c', 'kept'],
    ])
  })

  it('upserts: replaces the item of the same key, adds the others', () => {
    const after = upsertItems(config, [item('b', 2, 'fresh'), item('d', 0)])(
      list,
    )
    expect(items(after).map((i) => [i.id, i.text])).toEqual([
      ['d', ''],
      ['a', ''],
      ['b', 'fresh'],
      ['c', ''],
    ])
  })

  it('upserts with a merge of the loaded item and the fresh one', () => {
    const after = upsertItems(
      config,
      [item('b', 2, 'fresh')],
      (loaded, fresh) => ({ ...fresh, text: loaded.id + fresh.text }),
    )(list)
    expect(findByKey(config, 'b')(after)).toEqual(
      O.some(item('b', 2, 'bfresh')),
    )
  })

  it('keeps the pending change unless the change says where it lands', () => {
    const pending: Model<Item> = {
      ...list,
      pendingChange: { _tag: 'RecordPosition' },
    }
    expect(removeByKey(config, 'b')(pending).pendingChange).toEqual({
      _tag: 'RecordPosition',
    })
    expect(
      removeByKey(config, 'b', { _tag: 'NoChange' })(pending).pendingChange,
    ).toEqual({ _tag: 'None' })
  })
})

describe('item children', () => {
  const ping: ItemMsg = { _tag: 'Ping' }

  it('builds and reads the message carrying an item message', () => {
    const msg = childMsg(config, item('b', 2))(ping)
    expect(msg).toEqual({ _tag: 'ChildMsg', childId: 'b', subMsg: ping })
    expect(getChildMsg(msg)).toEqual(O.some({ key: 'b', msg: ping }))
    expect(getChildMsg({ _tag: 'NoOp' })).toEqual(O.none)
  })

  it('updates one child, and routes its Cmd back to it', async () => {
    const [after, cmd] = updateChild<Item, unknown, ItemMsg, never>(
      config,
      'b',
      (i) => [{ ...i, text: 'touched' }, Cmd.batch([pingCmd()])],
    )(list)
    expect(findByKey(config, 'b')(after)).toEqual(
      O.some(item('b', 2, 'touched')),
    )
    expect(await run(cmd)).toEqual([
      { _tag: 'ChildMsg', childId: 'b', subMsg: ping },
    ])
  })

  it('does nothing for a child that is not loaded', () => {
    const [after] = updateChild<Item, unknown, ItemMsg, never>(
      config,
      'z',
      (i) => [i, Cmd.none()],
    )(list)
    expect(after).toBe(list)
  })

  it('updates every child, each Cmd back to its own', async () => {
    const [after, cmd] = updateAllChildren<Item, unknown, ItemMsg, never>(
      config,
      (i) => [{ ...i, text: 'all' }, pingCmd()],
    )(list)
    expect(items(after).every((i) => i.text === 'all')).toBe(true)
    const sent = (await run(cmd)) as { childId: string }[]
    expect(sent.map((m) => m.childId).sort()).toEqual(['a', 'b', 'c'])
  })
})

// A Cmd that sends `Ping`
const pingCmd = (): Cmd<ItemMsg> => msgCmd<ItemMsg>({ _tag: 'Ping' })

describe('data source handlers', () => {
  it('turns a cache response into items', async () => {
    const cache = mkCacheHandler(
      async () => CacheData.fromRD(RD.success({ rows: [item('a', 1)] })),
      (response: { rows: Item[] }) => response.rows,
    )
    expect((await cache()).data).toEqual(RD.success([item('a', 1)]))
  })

  it('has an end with nothing to load', async () => {
    const { cache, endpoint } = noopHandler<Item>()([])(size(10))
    expect((await cache()).data).toEqual(RD.success([]))
    expect(await endpoint(true, [])()).toEqual(E.right([]))
  })

  it('loads the first page as the older end, with nothing newer', async () => {
    const initial = initialFromPrev<Item>(
      () => () => ({
        cache: async () => CacheData.fromRD(RD.success([item('a', 1)])),
        endpoint: () => async () => E.right([item('a', 1)]),
      }),
      size(10),
    )()
    const response = await initial.endpoint(true, [])()
    expect(E.isRight(response)).toBe(true)
    if (E.isRight(response)) {
      expect(response.right.nextIsMax).toBe(true)
      expect(response.right.dataF([])).toEqual([item('a', 1)])
    }
  })
})
