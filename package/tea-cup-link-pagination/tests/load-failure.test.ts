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
// A load whose cache read or endpoint THROWS must still report back: the
// list's Cmds dispatch their response with the failure instead of `NoOp`, so
// a list never stays loading. Before, a throwing cache read left the first
// page loading forever (its API request is started by the cache response),
// a throwing endpoint left it loading when no rows were shown, and a
// throwing older or newer page cache left "Loading history..." up for good.
import * as RD from '@devexperts/remote-data-ts'
import { mkHttpError } from '@rinn7e/tea-cup-prelude/type/http-error'
import * as E from 'fp-ts/lib/Either'
import type * as TE from 'fp-ts/lib/TaskEither'
import { describe, expect, it } from 'vitest'

import {
  getInitialDataFromApiCmd,
  getInitialDataFromApiResponseHandler,
  getInitialDataFromCacheCmd,
  getInitialDataFromCacheResponseHandler,
  getMoreNextDataFromCacheCmd,
  getMorePrevDataFromCacheCmd,
} from '../src/handler'
import {
  type EndpointHandler,
  type InitialEndpointResponse,
  type LogicConfig,
  type Model,
  defaultMode,
  mkRefs,
} from '../src/type'

type Item = { id: string }

const dataSourceId = 'test-list'

const throwingCache = async (): Promise<never> => {
  throw new Error('database is locked')
}

const throwingEndpoint: TE.TaskEither<
  never,
  InitialEndpointResponse<Item>
> = async () => {
  throw new Error('saving to the cache failed')
}

const model = (): Model<Item> => ({
  mode: {
    ...defaultMode<Item>(),
    dataSourceId,
    initial: { _tag: 'Loading' },
    initialHandler: () => ({
      cache: throwingCache,
      endpoint: () => throwingEndpoint,
    }),
  },
  pendingChange: { _tag: 'None' },
  visibility: { _tag: 'Visible' },
  isScrolling: false,
  initialScroll: { _tag: 'Pending' },
})

const config = {
  refs: mkRefs(),
  isReversed: true,
  uniqueKeyField: (item: Item) => item.id,
} as unknown as LogicConfig<Item, unknown, never>

type Dispatched = {
  _tag: string
  cache?: RD.RemoteData<unknown, unknown>
  result?: { _tag: string }
}

type Runnable = { execute: (d: (m: never) => void) => void }

// Runs a Cmd and waits for what it dispatches.
const run = async (cmd: unknown): Promise<Dispatched[]> => {
  const out: Dispatched[] = []
  ;(cmd as Runnable).execute((m) => out.push(m as Dispatched))
  await new Promise((resolve) => setTimeout(resolve, 0))
  return out
}

describe('a load that throws still reports back', () => {
  it('a first-page cache read that throws answers as a failed cache, so the API request still runs', async () => {
    const [msg] = await run(
      getInitialDataFromCacheCmd(true, dataSourceId, model()),
    )
    expect(msg._tag).toBe('GetInitialDataFromCacheResponse')
    expect(msg.cache?._tag).toBe('RemoteFailure')

    // ...which the cache leg takes as no cache: it shows nothing and starts
    // the API request.
    const [afterCache, apiCmd] = getInitialDataFromCacheResponseHandler(
      true,
      config,
      dataSourceId,
      RD.failure('database is locked') as never,
      model(),
    )
    expect(afterCache.mode.initial._tag).toBe('Loading')
    const [apiMsg] = await run(apiCmd)
    expect(apiMsg._tag).toBe('GetInitialDataFromApiResponse')
  })

  it('a first-page endpoint that throws answers as a failed API response', async () => {
    const [msg] = await run(getInitialDataFromApiCmd(true, model(), []))
    expect(msg._tag).toBe('GetInitialDataFromApiResponse')
    expect(msg.result?._tag).toBe('Left')

    // ...which ends the loading: the first load failed, with nothing to show.
    const [afterApi] = getInitialDataFromApiResponseHandler(
      config,
      dataSourceId,
      msg.result as never,
      model(),
    )
    expect(afterApi.mode.initial._tag).toBe('Failed')
    // ...without opening it: the load that brings rows still scrolls to the
    // target. Before, the open was marked done, so a later refresh showed the
    // rows anywhere.
    expect(afterApi.initialScroll).toEqual({ _tag: 'Pending' })
    expect(afterApi.visibility).toEqual({ _tag: 'Visible' })
  })

  // Before, an endpoint's own error was taken for a throw: logged as one, and
  // its status replaced by 400.
  it("an endpoint's own error reaches the list as it is", async () => {
    const unavailable = mkHttpError('unavailable', 503)
    const failing: Model<Item> = {
      ...model(),
      mode: {
        ...model().mode,
        initialHandler: () => ({
          cache: throwingCache,
          endpoint: () => async () => E.left(unavailable),
        }),
      },
    }
    const [msg] = await run(getInitialDataFromApiCmd(true, failing, []))
    expect(msg.result).toEqual(E.left(unavailable))
  })

  it('an older or newer page cache read that throws answers as a failed cache', async () => {
    const endpoint: EndpointHandler<Item> = () => async () => ({
      _tag: 'Right',
      right: [],
    })
    const [prev] = await run(
      getMorePrevDataFromCacheCmd(
        true,
        dataSourceId,
        throwingCache,
        endpoint,
        model(),
      ),
    )
    expect(prev._tag).toBe('GetMorePrevDataFromCacheResponse')
    expect(prev.cache?._tag).toBe('RemoteFailure')

    const [next] = await run(
      getMoreNextDataFromCacheCmd(
        true,
        dataSourceId,
        throwingCache,
        endpoint,
        model(),
      ),
    )
    expect(next._tag).toBe('GetMoreNextDataFromCacheResponse')
    expect(next.cache?._tag).toBe('RemoteFailure')
  })
})
