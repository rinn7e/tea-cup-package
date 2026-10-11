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
// Each end of a list (older and newer items) has one loading state, `Edge`:
// `Idle`, `Loading`, `Failed` or `Exhausted`. A load starts from `Idle` or
// `Failed`, so a failed load can be retried. Before, a failed older or newer
// page could never load again in the same open.
import * as RD from '@devexperts/remote-data-ts'
import { mkHttpError } from '@rinn7e/tea-cup-prelude/type/http-error'
import * as SUA from '@rinn7e/tea-cup-prelude/type/sorted-unique-array'
import * as E from 'fp-ts/lib/Either'
import * as S from 'fp-ts/lib/string'
import { describe, expect, it } from 'vitest'

import {
  addOrUpdateDataHandler,
  getInitialDataFromApiResponseHandler,
  getInitialDataFromCacheResponseHandler,
  getMoreNextDataFromApiResponseHandler,
  getMoreNextDataHandler,
  getMorePrevDataFromApiResponseHandler,
  getMorePrevDataHandler,
} from '../src/handler'
import {
  type Edge,
  type LogicConfig,
  type Model,
  defaultMode,
  mkRefs,
} from '../src/type'
import { reopenEdge } from '../src/util'

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
} as unknown as LogicConfig<Item, unknown, never>

const loaded = [{ id: 'b' }, { id: 'c' }]

// A list whose first page is loaded, with the given ends.
const model = (prev: Edge, next: Edge): Model<Item> => ({
  mode: {
    ...defaultMode<Item>(),
    dataSourceId,
    initial: { _tag: 'Loaded' },
    overallData: SUA.fromArray(eqWithKey, ord)(loaded),
    prev,
    next,
  },
  pendingChange: { _tag: 'None' },
  visibility: { _tag: 'Visible' },
  isScrolling: false,
  initialScroll: { _tag: 'Done' },
})

const idle: Edge = { _tag: 'Idle' }
const loading: Edge = { _tag: 'Loading' }
const failed: Edge = { _tag: 'Failed', error: mkHttpError('offline') }
const exhausted: Edge = { _tag: 'Exhausted' }

describe('loading an end', () => {
  it('starts from Idle', () => {
    const [prev] = getMorePrevDataHandler(true, model(idle, idle))
    expect(prev.mode.prev).toEqual(loading)
    const [next] = getMoreNextDataHandler(true, model(idle, idle))
    expect(next.mode.next).toEqual(loading)
  })

  it('starts again from Failed: a retry', () => {
    const [prev] = getMorePrevDataHandler(true, model(failed, idle))
    expect(prev.mode.prev).toEqual(loading)
    const [next] = getMoreNextDataHandler(true, model(idle, failed))
    expect(next.mode.next).toEqual(loading)
  })

  it('does not start while loading, or when there is nothing more', () => {
    for (const edge of [loading, exhausted]) {
      const start = model(edge, edge)
      expect(getMorePrevDataHandler(true, start)[0]).toBe(start)
      expect(getMoreNextDataHandler(true, start)[0]).toBe(start)
    }
  })

  it('does not start before the first page is loaded', () => {
    const start: Model<Item> = {
      ...model(idle, idle),
      mode: { ...model(idle, idle).mode, initial: { _tag: 'Loading' } },
    }
    expect(getMorePrevDataHandler(true, start)[0]).toBe(start)
  })
})

describe('a load of an end that answers', () => {
  it('with an error fails, and can then be retried', () => {
    const [afterPrev] = getMorePrevDataFromApiResponseHandler(
      config,
      dataSourceId,
      loaded,
      E.left(mkHttpError('offline')),
      model(loading, idle),
    )
    expect(afterPrev.mode.prev).toEqual(failed)
    expect(getMorePrevDataHandler(true, afterPrev)[0].mode.prev).toEqual(
      loading,
    )

    const [afterNext] = getMoreNextDataFromApiResponseHandler(
      config,
      dataSourceId,
      loaded,
      E.left(mkHttpError('offline')),
      model(idle, loading),
    )
    expect(afterNext.mode.next).toEqual(failed)
  })

  it('with new items goes back to Idle', () => {
    const [afterPrev] = getMorePrevDataFromApiResponseHandler(
      config,
      dataSourceId,
      loaded,
      E.right([{ id: 'd' }]),
      model(loading, idle),
    )
    expect(afterPrev.mode.prev).toEqual(idle)
    expect(afterPrev.mode.overallData.value.map((i) => i.id)).toEqual([
      'b',
      'c',
      'd',
    ])
  })

  it('with no new items is exhausted', () => {
    const [afterPrev] = getMorePrevDataFromApiResponseHandler(
      config,
      dataSourceId,
      loaded,
      E.right([{ id: 'c' }]),
      model(loading, idle),
    )
    expect(afterPrev.mode.prev).toEqual(exhausted)

    const [afterNext] = getMoreNextDataFromApiResponseHandler(
      config,
      dataSourceId,
      loaded,
      E.right([]),
      model(idle, loading),
    )
    expect(afterNext.mode.next).toEqual(exhausted)
  })
})

describe('the first page', () => {
  it('sets the newer end from the response', () => {
    const opening = model(idle, idle)
    const answer = (nextIsMax: boolean) =>
      getInitialDataFromApiResponseHandler(
        config,
        dataSourceId,
        E.right({ dataF: () => loaded, nextIsMax }),
        opening,
      )[0].mode.next
    expect(answer(true)).toEqual(exhausted)
    expect(answer(false)).toEqual(idle)
  })
})

describe('reopening an end', () => {
  it('lets an exhausted end load again, and keeps a load or a failure', () => {
    expect(reopenEdge(exhausted)).toEqual(idle)
    expect(reopenEdge(idle)).toEqual(idle)
    expect(reopenEdge(loading)).toEqual(loading)
    expect(reopenEdge(failed)).toEqual(failed)
  })

  it('happens to the older end when an item is added', () => {
    const after = addOrUpdateDataHandler(config, model(exhausted, idle), {
      dataSourceId,
      value: [{ data: { id: 'a' }, previousId: null }],
      compareId: (item, id) => item.id === id,
    })
    expect(after.mode.prev).toEqual(idle)
  })
})

// While a list opens, the cached rows are shown before the API answers, and
// the API's rows replace them. Before, the cache step marked the first page
// loaded, so scrolling to the end loaded the newer page from the cached rows;
// the API's answer then reopened that end while the load was in flight, a
// second, duplicate load started, and finding nothing new it marked the end
// exhausted: newer messages never loaded.
describe('a list opening from the cache', () => {
  const opening: Model<Item> = {
    ...model(idle, idle),
    mode: {
      ...model(idle, idle).mode,
      initial: { _tag: 'Loading' },
      overallData: SUA.empty(),
    },
    initialScroll: { _tag: 'Pending' },
  }
  const fromCache = getInitialDataFromCacheResponseHandler(
    true,
    config,
    dataSourceId,
    RD.success(loaded),
    opening,
  )[0]

  it('shows the cached rows as Cached, and loads no end from them', () => {
    expect(fromCache.mode.initial).toEqual({ _tag: 'Cached' })
    expect(fromCache.mode.overallData.value).toEqual(loaded)
    expect(getMoreNextDataHandler(true, fromCache)[0]).toBe(fromCache)
    expect(getMorePrevDataHandler(true, fromCache)[0]).toBe(fromCache)
  })

  it('loads the ends once the API answered', () => {
    const [answered] = getInitialDataFromApiResponseHandler(
      config,
      dataSourceId,
      E.right({ dataF: () => loaded, nextIsMax: false }),
      fromCache,
    )
    expect(answered.mode.initial).toEqual({ _tag: 'Loaded' })
    expect(getMoreNextDataHandler(true, answered)[0].mode.next).toEqual(loading)
  })

  // Before, every refresh went Loaded → Cached → Loaded, so the older end's
  // trigger above a reversed list went away and came back, moving the view
  // in WebKit.
  it('a refresh of a loaded list stays Loaded, its ends ready to load', () => {
    const [refreshed] = getInitialDataFromCacheResponseHandler(
      true,
      config,
      dataSourceId,
      RD.success(loaded),
      model(idle, idle),
    )
    expect(refreshed.mode.initial).toEqual({ _tag: 'Loaded' })
    expect(getMorePrevDataHandler(true, refreshed)[0].mode.prev).toEqual(
      loading,
    )
  })

  it('keeps the cached rows, loaded, when the API fails', () => {
    const [failedApi] = getInitialDataFromApiResponseHandler(
      config,
      dataSourceId,
      E.left(mkHttpError('offline')),
      fromCache,
    )
    expect(failedApi.mode.initial).toEqual({ _tag: 'Loaded' })
    expect(failedApi.mode.overallData.value).toEqual(loaded)
  })
})

describe("the first page's API answer and a load in flight", () => {
  const answer = (nextIsMax: boolean, m: Model<Item>) =>
    getInitialDataFromApiResponseHandler(
      config,
      dataSourceId,
      E.right({ dataF: () => loaded, nextIsMax }),
      m,
    )[0]

  it('keeps the load in flight, so no second load starts', () => {
    const answered = answer(false, model(idle, loading))
    expect(answered.mode.next).toEqual(loading)
    expect(getMoreNextDataHandler(true, answered)[0]).toBe(answered)
  })

  it('keeps a failed end failed (it can still be retried)', () => {
    expect(answer(false, model(idle, failed)).mode.next).toEqual(failed)
  })

  it('reopens an exhausted end when there is more', () => {
    expect(answer(false, model(idle, exhausted)).mode.next).toEqual(idle)
  })

  it('marks the end exhausted, and the load in flight keeps it so', () => {
    const answered = answer(true, model(idle, loading))
    expect(answered.mode.next).toEqual(exhausted)
    const [afterLoad] = getMoreNextDataFromApiResponseHandler(
      config,
      dataSourceId,
      loaded,
      E.right([{ id: 'a' }]),
      answered,
    )
    expect(afterLoad.mode.next).toEqual(exhausted)
    const [afterFailure] = getMoreNextDataFromApiResponseHandler(
      config,
      dataSourceId,
      loaded,
      E.left(mkHttpError('offline')),
      answered,
    )
    expect(afterFailure.mode.next).toEqual(exhausted)
  })
})
