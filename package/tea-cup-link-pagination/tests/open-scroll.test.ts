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
// The open's scroll: the list stays hidden until the scroll to its current
// target is placed, and a reader who scrolled the cached rows isn't pulled
// back.
import * as ScrollContainer from '@rinn7e/tea-cup-scroll-container'
import * as E from 'fp-ts/lib/Either'
import { describe, expect, it } from 'vitest'

import { newScrollStateRef } from '../src/common/type/scroll-state-map'
import {
  getInitialDataFromApiResponseHandler,
  scrollToCurrentHandler,
} from '../src/handler'
import { restoreSavedScroll, setSelectedKey } from '../src/helper'
import {
  type LogicConfig,
  type Model,
  type Msg,
  defaultMode,
  mkRefs,
} from '../src/type'
import { update } from '../src/update'

type Item = { id: string }

const dataSourceId = 'test-list'

const config = {
  refs: mkRefs(),
  isReversed: true,
  ord: {
    equals: (a: Item, b: Item) => a.id === b.id,
    compare: (a: Item, b: Item) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  },
  uniqueKeyField: (item: Item) => item.id,
} as unknown as LogicConfig<Item, unknown, never>

const model = (m: Partial<Model<Item>>): Model<Item> => ({
  mode: { ...defaultMode<Item>(), dataSourceId, initial: { _tag: 'Cached' } },
  flash: null,
  initialScroll: { _tag: 'Done' },
  scrollContainer: ScrollContainer.init(),
  ...m,
})

const send = (msg: Msg<Item, never, never>, m: Model<Item>) =>
  update<Item, unknown, never, never>(true, config)(null, msg, m)[0]

// The list hidden by a scroll of ours is shown again by that scroll's
// `Placed` (the scroll container's, once a frame painted it there), and only
// by it (see `ScrollContainer.Model.placing`).
describe('a finished scroll', () => {
  const placed = (seq: number): Msg<Item, never, never> => ({
    _tag: 'ScrollContainerMsg',
    subMsg: { _tag: 'Placed', seq },
  })
  // The open's scroll to `key`, its current target
  const openAt = (key: string, m: Model<Item> = model({})): Model<Item> =>
    scrollToCurrentHandler<Item, unknown, never, never>(config, {
      isGraceful: false,
    })(setSelectedKey(key)(m))[0]
  const isPlacing = (m: Model<Item>) =>
    ScrollContainer.isPlacing(m.scrollContainer)
  const seqOf = (m: Model<Item>) => m.scrollContainer.placing!

  it('hides the list until the scroll that hid it is placed', () => {
    const hidden = openAt('target')
    expect(isPlacing(hidden)).toBe(true)
    expect(isPlacing(send(placed(seqOf(hidden)), hidden))).toBe(false)
  })

  // Before, any finished scroll showed the list: a scroll to the cached
  // target finishing after the API moved the target showed it before the
  // newer scroll was done.
  it('does not show it when a newer hidden scroll replaced it', () => {
    const cached = openAt('cached')
    const moved = openAt('moved', cached)
    expect(isPlacing(send(placed(seqOf(cached)), moved))).toBe(true)
    expect(isPlacing(send(placed(seqOf(moved)), moved))).toBe(false)
  })

  // Comparing with `selectedKey` instead, a target changed without a new
  // scroll (a route change within the same view) left the list hidden
  // for good.
  it('shows the list when the target changed without a new scroll', () => {
    const hidden = openAt('target')
    const changed = setSelectedKey('other')(hidden)
    expect(isPlacing(send(placed(seqOf(hidden)), changed))).toBe(false)
  })

  it('does not hide the list for a scroll after the API changed the rows', () => {
    const [graceful] = scrollToCurrentHandler<Item, unknown, never, never>(
      config,
      { isGraceful: true },
    )(setSelectedKey('target')(model({})))
    expect(isPlacing(graceful)).toBe(false)
  })

  it("a restore's end doesn't show the list a scroll hid since", () => {
    const ref = newScrollStateRef()
    ref.write(new Map([[dataSourceId, { key: 'target', top: 0 }]]))()
    const [restoring] = restoreSavedScroll(ref, { resetEdges: false })<
      Item,
      never,
      never
    >(model({}))
    expect(isPlacing(restoring)).toBe(true)
    const hidden = openAt('target', restoring)
    expect(isPlacing(send(placed(seqOf(restoring)), hidden))).toBe(true)
  })
})

// Before, when the API changed the rows around the cached target, the list
// scrolled back to it, even when the reader had scrolled away meanwhile.
// The scroll container reports the reader taking over (wheel, touch, key)
const readerScrolled: Msg<Item, never, never> = {
  _tag: 'ScrollContainerMsg',
  subMsg: { _tag: 'ReaderScrolled', input: 'wheel' },
}

describe('a reader scrolling the cached rows', () => {
  const fromCache = model({
    mode: {
      ...model({}).mode,
      selectedKey: 'b',
      overallData: {
        value: [{ id: 'b' }],
      } as Model<Item>['mode']['overallData'],
    },
    initialScroll: { _tag: 'FromCache', key: 'b' },
  })

  it('ends the open', () => {
    expect(send(readerScrolled, fromCache).initialScroll).toEqual({
      _tag: 'Done',
    })
  })

  it('is not pulled back when the API changes the rows', () => {
    const read = send(readerScrolled, fromCache)
    const [answered] = getInitialDataFromApiResponseHandler(
      config,
      dataSourceId,
      E.right({ dataF: () => [{ id: 'a' }, { id: 'b' }], nextIsMax: true }),
      read,
    )
    expect(ScrollContainer.isPlacing(answered.scrollContainer)).toBe(false)
    // No scroll for the scroll container: the reader stays where they are
    expect(answered.scrollContainer).toEqual(read.scrollContainer)
  })

  it('is scrolled again when the API changes the rows before the reader scrolls', () => {
    // The control: the same answer without the reader re-aims at the target
    const [answered] = getInitialDataFromApiResponseHandler(
      config,
      dataSourceId,
      E.right({ dataF: () => [{ id: 'a' }, { id: 'b' }], nextIsMax: true }),
      fromCache,
    )
    expect(answered.scrollContainer.follow._tag).toBe('Navigating')
  })

  it('changes nothing of the open once it is done', () => {
    const opened = model({})
    expect(send(readerScrolled, opened).initialScroll).toEqual(
      opened.initialScroll,
    )
  })
})

// An open at the stored reading position lands its row where it was read (the
// row covering the top edge, usually starting above it), as a restore of the
// kept list does: at the start of the row, the reader saw again what they had
// nearly passed.
describe('an open at the stored reading position', () => {
  const commandOf = (m: Model<Item>) => m.scrollContainer.pendingAdjust?.command
  const openAt = (m: Model<Item>): Model<Item> =>
    scrollToCurrentHandler<Item, unknown, never, never>(config, {
      isGraceful: false,
    })(m)[0]
  const stored = { key: 'b', offset: -120 }
  const atStored = (selectedKey: string) =>
    model({
      mode: {
        ...model({}).mode,
        selectedKey,
        selectedAnchor: stored,
      },
    })

  it('lands its row at the stored offset, the pixel a restore lands it at', () => {
    expect(commandOf(openAt(atStored('b')))).toMatchObject({
      _tag: 'ScrollToKey',
      key: 'b',
      offset: -120,
    })
    // The restore of the same stored position, for the kept list
    const ref = newScrollStateRef()
    ref.write(new Map([[dataSourceId, { key: 'b', top: -120 }]]))()
    const [restoring] = restoreSavedScroll(ref, { resetEdges: false })<
      Item,
      never,
      never
    >(model({}))
    expect(commandOf(restoring)).toMatchObject({ key: 'b', offset: -120 })
  })

  it('lands another target at the top of the view (the API moved it)', () => {
    expect(commandOf(openAt(atStored('c')))).toMatchObject({
      _tag: 'ScrollToKey',
      key: 'c',
      offset: 0,
    })
  })
})
