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
import * as E from 'fp-ts/lib/Either'
import { describe, expect, it } from 'vitest'

import {
  getInitialDataFromApiResponseHandler,
  getInitialDataFromCacheResponseHandler,
  getInitialDataHandler,
  refreshInitialDataHandler,
} from '../src/handler'
import { type InitialEndpointResponse, type Model } from '../src/type'
import {
  type Item,
  dataSourceId,
  item,
  mkConfig,
  okResponse,
  openingModel,
  scrolledGracefully,
  scrolledHidden,
  settled,
} from './fixture'

// Opening a list scrolls it once, to its target: right away when the cached
// rows hold the target, otherwise when the API answers.

const config = mkConfig()

const cacheStep = (model: Model<Item>, cached: Item[]) =>
  getInitialDataFromCacheResponseHandler(
    true,
    config,
    dataSourceId,
    cached.length === 0 ? RD.initial : RD.success(cached),
    model,
  )[0]

const apiStep = (
  model: Model<Item>,
  response: E.Either<never, InitialEndpointResponse<Item>>,
) =>
  getInitialDataFromApiResponseHandler(
    config,
    dataSourceId,
    response as never,
    model,
  )[0]

const cached = [item('older', 1), item('target', 3)]

describe('opening at a target', () => {
  it('shows cached rows that hold the target and scrolls to it right away', () => {
    const afterCache = cacheStep(openingModel('target'), cached)
    expect(scrolledHidden(afterCache)).toBe(true)
    expect(afterCache.initialScroll).toEqual({
      _tag: 'FromCache',
      key: 'target',
    })
    expect(afterCache.mode.overallData.value.length).toBe(2)
  })

  it('does not scroll again when the API confirms the target and the rows', () => {
    const afterCache = cacheStep(openingModel('target'), cached)
    const afterApi = apiStep(settled(afterCache), okResponse(cached, 'target'))
    expect(scrolledHidden(afterApi)).toBe(false)
    expect(scrolledGracefully(afterApi)).toBe(false)
    expect(afterApi.initialScroll._tag).toBe('Done')
  })

  it('scrolls again, hidden, when the API moved the target', () => {
    const afterCache = cacheStep(openingModel('target'), cached)
    const afterApi = apiStep(settled(afterCache), okResponse(cached, null))
    expect(scrolledHidden(afterApi)).toBe(true)
    expect(afterApi.mode.selectedKey).toBe(null)
    expect(afterApi.initialScroll._tag).toBe('Done')
  })

  it('scrolls again without hiding the list when only the rows changed', () => {
    const afterCache = cacheStep(openingModel('target'), cached)
    const afterApi = apiStep(
      settled(afterCache),
      okResponse([...cached, item('newer', 4)], 'target'),
    )
    expect(scrolledGracefully(afterApi)).toBe(true)
  })

  it('does not show cached rows without the target; the API step scrolls', () => {
    const others = [item('older', 1), item('other', 2)]
    const afterCache = cacheStep(openingModel('target'), others)
    expect(scrolledHidden(afterCache)).toBe(false)
    expect(afterCache.mode.initialData._tag).toBe('RemotePending')
    expect(afterCache.mode.overallData.value.length).toBe(0)
    expect(afterCache.initialScroll._tag).toBe('Pending')

    const afterApi = apiStep(afterCache, okResponse(cached, 'target'))
    expect(scrolledHidden(afterApi)).toBe(true)
    expect(afterApi.initialScroll._tag).toBe('Done')
  })

  it('leaves the scroll to the API step when nothing is cached', () => {
    const afterCache = cacheStep(openingModel('target'), [])
    expect(scrolledHidden(afterCache)).toBe(false)
    expect(
      scrolledHidden(apiStep(afterCache, okResponse(cached, 'target'))),
    ).toBe(true)
  })
})

describe('opening at the newest page', () => {
  it('scrolls on the cache step, and not again on the API step', () => {
    const afterCache = cacheStep(openingModel(null), cached)
    expect(scrolledHidden(afterCache)).toBe(true)
    expect(afterCache.initialScroll._tag).toBe('Done')
    expect(
      scrolledHidden(apiStep(settled(afterCache), okResponse(cached))),
    ).toBe(false)
  })
})

describe('the open scrolls once', () => {
  const opened = () =>
    settled(
      apiStep(
        settled(cacheStep(openingModel('target'), cached)),
        okResponse(cached, 'target'),
      ),
    )

  it('a refresh of an opened list does not scroll, even when the rows changed', () => {
    const refreshed = apiStep(
      cacheStep(opened(), cached),
      okResponse([...cached, item('newer', 4)]),
    )
    expect(scrolledHidden(refreshed)).toBe(false)
    expect(scrolledGracefully(refreshed)).toBe(false)
    expect(refreshed.initialScroll._tag).toBe('Done')
  })

  it('a failed API response settles the scroll, so a later refresh cannot scroll', () => {
    const afterApi = apiStep(
      settled(cacheStep(openingModel('target'), cached)),
      E.left('unavailable') as never,
    )
    expect(afterApi.initialScroll._tag).toBe('Done')
  })

  it('GetInitialData re-arms the scroll; RefreshInitialData keeps it settled', () => {
    expect(getInitialDataHandler(true)(opened())[0].initialScroll._tag).toBe(
      'Pending',
    )
    const [refreshed] = refreshInitialDataHandler(true)(opened())
    expect(refreshed.initialScroll._tag).toBe('Done')
    expect(refreshed.mode.initialData._tag).toBe('RemoteSuccess')
  })

  it('ignores responses for another list', () => {
    const other = getInitialDataFromCacheResponseHandler(
      true,
      config,
      'another-list',
      RD.success(cached),
      openingModel(null),
    )[0]
    expect(scrolledHidden(other)).toBe(false)
    expect(other.initialScroll._tag).toBe('Pending')
  })
})
