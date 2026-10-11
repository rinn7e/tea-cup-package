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
  type Model,
} from '../src/type'
import { type Item, dataSourceId, mkConfig, openingModel } from './fixture'

// A load whose cache read or endpoint throws still reports back, so the list
// never stays loading.

const throwingCache = async (): Promise<never> => {
  throw new Error('the cache cannot be read')
}

const throwingEndpoint: TE.TaskEither<
  never,
  InitialEndpointResponse<Item>
> = async () => {
  throw new Error('saving the response failed')
}

const throwingModel = (): Model<Item> => {
  const m = openingModel(null)
  return {
    ...m,
    mode: {
      ...m.mode,
      initialHandler: () => ({
        cache: throwingCache,
        endpoint: () => throwingEndpoint,
      }),
    },
  }
}

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
  it('a first-page cache read that throws answers as a failed cache, and the API request still runs', async () => {
    const [msg] = await run(
      getInitialDataFromCacheCmd(true, dataSourceId, throwingModel()),
    )
    expect(msg._tag).toBe('GetInitialDataFromCacheResponse')
    expect(msg.cache?._tag).toBe('RemoteFailure')

    const [afterCache, apiCmd] = getInitialDataFromCacheResponseHandler(
      true,
      mkConfig(),
      dataSourceId,
      RD.failure('the cache cannot be read') as never,
      throwingModel(),
    )
    expect(afterCache.mode.initial._tag).toBe('Loading')
    const [apiMsg] = await run(apiCmd)
    expect(apiMsg._tag).toBe('GetInitialDataFromApiResponse')
  })

  it('a first-page endpoint that throws answers as a failed API response, which ends the loading', async () => {
    const [msg] = await run(getInitialDataFromApiCmd(true, throwingModel(), []))
    expect(msg._tag).toBe('GetInitialDataFromApiResponse')
    expect(msg.result?._tag).toBe('Left')

    const [afterApi] = getInitialDataFromApiResponseHandler(
      mkConfig(),
      dataSourceId,
      msg.result as never,
      throwingModel(),
    )
    expect(afterApi.mode.initial._tag).toBe('Failed')
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
        throwingModel(),
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
        throwingModel(),
      ),
    )
    expect(next._tag).toBe('GetMoreNextDataFromCacheResponse')
    expect(next.cache?._tag).toBe('RemoteFailure')
  })
})
