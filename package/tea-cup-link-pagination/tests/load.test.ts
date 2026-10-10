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
import * as RD from '@devexperts/remote-data-ts'
import * as CacheData from '@rinn7e/tea-cup-prelude/type/cache-data'
import { mkHttpError } from '@rinn7e/tea-cup-prelude/type/http-error'
import * as SUA from '@rinn7e/tea-cup-prelude/type/sorted-unique-array'
import * as E from 'fp-ts/lib/Either'
import * as Ord from 'fp-ts/lib/Ord'
import * as TE from 'fp-ts/lib/TaskEither'
import { pipe } from 'fp-ts/lib/function'
import * as N from 'fp-ts/lib/number'
import { Cmd, Sub } from 'tea-cup-fp'
import { describe, expect, it, vi } from 'vitest'

import {
  type Edge,
  type LogicConfig,
  type Mode,
  type Model,
  type Msg,
  canLoadEdge,
  defaultMode,
  mkRefs,
  nextAfterInitial,
  reopenEdge,
  update,
} from '../src'

type Item = { id: string; ts: number }
type TestMsg = Msg<Item, null, null>

const ord: Ord.Ord<Item> = pipe(
  N.Ord,
  Ord.contramap((item: Item) => item.ts),
)

const config: LogicConfig<Item, null, null> = {
  refs: mkRefs(),
  mode: defaultMode<Item>(),
  isReversed: true,
  eqWithKey: { equals: (first, second) => first.id === second.id },
  ord,
  uniqueKeyField: (item) => item.id,
  visibleStrategy: { _tag: 'FullInView' },
  update: (_parent, _msg, item) => [item, Cmd.none(), { _tag: 'NoChange' }],
  subscriptions: () => Sub.none(),
}

const items = (...ts: number[]): Item[] =>
  ts.map((t) => ({ id: `i${t}`, ts: t }))

const error = mkHttpError('boom', 503)

const model = (mode: Partial<Mode<Item>> = {}): Model<Item> => ({
  mode: {
    ...defaultMode<Item>(),
    dataSourceId: 'test',
    initial: { _tag: 'Loaded' },
    overallData: SUA.fromArray(config.eqWithKey, ord)(items(1, 2, 3)),
    ...mode,
  },
  containerChangeEvent: { _tag: 'NoChange' },
  invisWhileScrolling: false,
  isScrolling: false,
  savedScrollPos: null,
  initialScrollDone: true,
})

const step = (msg: TestMsg, m: Model<Item>) =>
  update<Item, null, null, null>(true, config)(null, msg, m)

// Run a Cmd and collect what it dispatches once its promises have settled.
const run = (cmd: Cmd<TestMsg>): Promise<TestMsg[]> => {
  const sent: TestMsg[] = []
  cmd.execute((msg) => sent.push(msg))
  return new Promise((resolve) => setTimeout(() => resolve(sent), 0))
}

const failingCache = () => async (): Promise<CacheData.Type<Item[]>> => {
  throw new Error('cache broken')
}

describe('edge helpers', () => {
  it('canLoadEdge allows Idle, Loaded and Failed only', () => {
    const allowed = (
      [
        { _tag: 'Idle' },
        { _tag: 'Loading' },
        { _tag: 'Loaded' },
        { _tag: 'Failed', error },
        { _tag: 'Exhausted' },
      ] satisfies Edge[]
    ).map(canLoadEdge)
    expect(allowed).toEqual([true, false, true, true, false])
  })

  it('reopenEdge turns only Exhausted back into Idle', () => {
    expect(reopenEdge({ _tag: 'Exhausted' })).toEqual({ _tag: 'Idle' })
    expect(reopenEdge({ _tag: 'Loading' })).toEqual({ _tag: 'Loading' })
    expect(reopenEdge({ _tag: 'Failed', error })).toEqual({
      _tag: 'Failed',
      error,
    })
  })

  it('nextAfterInitial follows the API, keeping a load in flight', () => {
    expect(nextAfterInitial(true, { _tag: 'Loading' })).toEqual({
      _tag: 'Exhausted',
    })
    expect(nextAfterInitial(false, { _tag: 'Exhausted' })).toEqual({
      _tag: 'Idle',
    })
    expect(nextAfterInitial(false, { _tag: 'Loading' })).toEqual({
      _tag: 'Loading',
    })
  })
})

describe.each([
  {
    end: 'prev' as const,
    get: 'GetMorePrevData' as const,
    cacheResponse: 'GetMorePrevDataFromCacheResponse' as const,
    apiResponse: 'GetMorePrevDataFromApiResponse' as const,
  },
  {
    end: 'next' as const,
    get: 'GetMoreNextData' as const,
    cacheResponse: 'GetMoreNextDataFromCacheResponse' as const,
    apiResponse: 'GetMoreNextDataFromApiResponse' as const,
  },
])('$end end', ({ end, get, cacheResponse, apiResponse }) => {
  const withEdge = (edge: Edge, mode: Partial<Mode<Item>> = {}) =>
    model({ [end]: edge, ...mode })

  it.each([
    { _tag: 'Idle' },
    { _tag: 'Loaded' },
    { _tag: 'Failed', error },
  ] satisfies Edge[])('starts loading from $_tag', (edge) => {
    const [next] = step({ _tag: get }, withEdge(edge))
    expect(next.mode[end]).toEqual({ _tag: 'Loading' })
  })

  it.each([{ _tag: 'Loading' }, { _tag: 'Exhausted' }] satisfies Edge[])(
    'refuses to load from $_tag',
    async (edge) => {
      const before = withEdge(edge)
      const [next, cmd] = step({ _tag: get }, before)
      expect(next).toBe(before)
      expect(await run(cmd)).toEqual([])
    },
  )

  it('refuses to load before the first page is loaded', () => {
    const before = withEdge({ _tag: 'Idle' }, { initial: { _tag: 'Loading' } })
    const [next] = step({ _tag: get }, before)
    expect(next).toBe(before)
  })

  it('carries on to the API when the cache throws', async () => {
    const handler = () => () => ({
      cache: failingCache(),
      endpoint: () => TE.right([]),
    })
    const [, cmd] = step(
      { _tag: get },
      withEdge(
        { _tag: 'Idle' },
        { prevHandler: handler, nextHandler: handler },
      ),
    )
    const sent = await run(cmd)
    expect(sent).toHaveLength(1)
    expect(sent[0]._tag).toBe(cacheResponse)
    expect(sent[0]._tag === cacheResponse && sent[0].cache._tag).toBe(
      'RemoteFailure',
    )
  })

  it('fails with the error when the API fails', () => {
    const [next] = step(
      {
        _tag: apiResponse,
        dataSourceId: 'test',
        overallDataBeforeCache: items(1, 2, 3),
        result: E.left(error),
      },
      withEdge({ _tag: 'Loading' }),
    )
    expect(next.mode[end]).toEqual({ _tag: 'Failed', error })
  })

  it('is loaded when the page brings new items, exhausted when not', () => {
    const response = (page: Item[]): TestMsg => ({
      _tag: apiResponse,
      dataSourceId: 'test',
      overallDataBeforeCache: items(1, 2, 3),
      result: E.right(page),
    })
    const loading = withEdge({ _tag: 'Loading' })
    expect(step(response(items(0, 4)), loading)[0].mode[end]).toEqual({
      _tag: 'Loaded',
    })
    expect(step(response(items(1, 2)), loading)[0].mode[end]).toEqual({
      _tag: 'Exhausted',
    })
  })

  it('ignores a reply for another data source', () => {
    const before = withEdge({ _tag: 'Loading' })
    const [next] = step(
      {
        _tag: apiResponse,
        dataSourceId: 'other',
        overallDataBeforeCache: [],
        result: E.left(error),
      },
      before,
    )
    expect(next).toBe(before)
  })
})

describe('first page', () => {
  const empty = (mode: Partial<Mode<Item>> = {}) =>
    model({ overallData: SUA.empty(), initial: { _tag: 'Idle' }, ...mode })

  it('GetInitialData starts loading', () => {
    const [next] = step({ _tag: 'GetInitialData' }, empty())
    expect(next.mode.initial).toEqual({ _tag: 'Loading' })
    expect(next.initialScrollDone).toBe(false)
  })

  it('carries on to the API when the cache throws', async () => {
    const [, cmd] = step(
      { _tag: 'GetInitialData' },
      empty({
        initialHandler: () => ({
          cache: failingCache(),
          endpoint: () => TE.right({ dataF: () => [], nextIsMax: true }),
        }),
      }),
    )
    const sent = await run(cmd)
    expect(sent).toHaveLength(1)
    expect(sent[0]._tag).toBe('GetInitialDataFromCacheResponse')
  })

  it('a failed cache keeps loading and asks the API', async () => {
    const endpoint = vi.fn(() => TE.left(error))
    const [next, cmd] = step(
      {
        _tag: 'GetInitialDataFromCacheResponse',
        dataSourceId: 'test',
        cache: RD.failure(error),
      },
      empty({
        initial: { _tag: 'Loading' },
        initialHandler: () => ({
          cache: async () => CacheData.fromRD(RD.initial),
          endpoint,
        }),
      }),
    )
    expect(next.mode.initial).toEqual({ _tag: 'Loading' })
    const sent = await run(cmd)
    expect(endpoint).toHaveBeenCalledOnce()
    // The API failure comes back as a reply, not a dropped `NoOp`.
    expect(sent).toHaveLength(1)
    expect(sent[0]._tag).toBe('GetInitialDataFromApiResponse')
    expect(
      sent[0]._tag === 'GetInitialDataFromApiResponse' &&
        E.isLeft(sent[0].result),
    ).toBe(true)
  })

  it('an API failure without cached items fails with the error', () => {
    const [next] = step(
      {
        _tag: 'GetInitialDataFromApiResponse',
        dataSourceId: 'test',
        result: E.left(error),
      },
      empty({ initial: { _tag: 'Loading' } }),
    )
    expect(next.mode.initial).toEqual({ _tag: 'Failed', error })
  })

  it('an API failure with cached items keeps showing them', () => {
    const before = model({ initial: { _tag: 'Loaded' } })
    const [next] = step(
      {
        _tag: 'GetInitialDataFromApiResponse',
        dataSourceId: 'test',
        result: E.left(error),
      },
      before,
    )
    expect(next.mode.initial).toEqual({ _tag: 'Loaded' })
    expect(next.mode.overallData).toEqual(before.mode.overallData)
  })

  it('an API success loads the items and sets the newer end', () => {
    const response = (nextIsMax: boolean): TestMsg => ({
      _tag: 'GetInitialDataFromApiResponse',
      dataSourceId: 'test',
      result: E.right({ dataF: () => items(5, 6), nextIsMax }),
    })
    const loading = empty({
      initial: { _tag: 'Loading' },
      next: { _tag: 'Exhausted' },
    })
    const [atNewest] = step(response(true), loading)
    expect(atNewest.mode.initial).toEqual({ _tag: 'Loaded' })
    expect(atNewest.mode.overallData.value).toEqual(items(5, 6))
    expect(atNewest.mode.next).toEqual({ _tag: 'Exhausted' })
    expect(step(response(false), loading)[0].mode.next).toEqual({
      _tag: 'Idle',
    })
  })

  it('the cache leg scrolls only when no selected key could be re-pointed', () => {
    const cacheResponse: TestMsg = {
      _tag: 'GetInitialDataFromCacheResponse',
      dataSourceId: 'test',
      cache: RD.success(items(1, 2)),
    }
    const loading = (selectedKey: string | null) =>
      empty({
        initial: { _tag: 'Loading' },
        selectedKey,
      })
    const unscrolled = (m: Model<Item>) => ({ ...m, initialScrollDone: false })

    const [newest] = step(cacheResponse, unscrolled(loading(null)))
    expect(newest.mode.initial).toEqual({ _tag: 'Loaded' })
    expect(newest.initialScrollDone).toBe(true)

    const [selected] = step(cacheResponse, unscrolled(loading('i1')))
    expect(selected.mode.initial).toEqual({ _tag: 'Loaded' })
    expect(selected.initialScrollDone).toBe(false)

    // The API leg then takes the scroll it was left, even on a failure.
    const [afterApi] = step(
      {
        _tag: 'GetInitialDataFromApiResponse',
        dataSourceId: 'test',
        result: E.left(error),
      },
      selected,
    )
    expect(afterApi.initialScrollDone).toBe(true)
  })

  it('SetInitialData sets the items or the failure', () => {
    const [loaded] = step(
      {
        _tag: 'SetInitialData',
        dataSourceId: 'test',
        value: E.right(items(7)),
      },
      empty(),
    )
    expect(loaded.mode.initial).toEqual({ _tag: 'Loaded' })
    expect(loaded.mode.overallData.value).toEqual(items(7))

    const [failed] = step(
      { _tag: 'SetInitialData', dataSourceId: 'test', value: E.left(error) },
      empty(),
    )
    expect(failed.mode.initial).toEqual({ _tag: 'Failed', error })
  })
})

describe('older end reopening', () => {
  it('a new item reopens an exhausted older end', () => {
    const [next] = step(
      {
        _tag: 'AddOrUpdateData',
        dataSourceId: 'test',
        value: [{ data: { id: 'i0', ts: 0 }, previousId: null }],
        compareId: (item, id) => item.id === id,
      },
      model({ prev: { _tag: 'Exhausted' } }),
    )
    expect(next.mode.prev).toEqual({ _tag: 'Idle' })
  })
})
