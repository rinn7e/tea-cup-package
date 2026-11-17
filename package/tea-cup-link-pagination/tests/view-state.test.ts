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
// What the list shows from its model and from what the scroll container
// reports, without reading the DOM: the highlight of a search result's row
// (`flash`), and the "go to latest" button.
import * as SUA from '@rinn7e/tea-cup-prelude/type/sorted-unique-array'
import * as ScrollContainer from '@rinn7e/tea-cup-scroll-container'
import * as S from 'fp-ts/lib/string'
import { describe, expect, it, vi } from 'vitest'

import { FLASH_MS } from '../src/handler'
import {
  type Edge,
  type LogicConfig,
  type Model,
  type Msg,
  defaultMode,
  mkRefs,
} from '../src/type'
import { update } from '../src/update'
import { isLatestButtonVisible } from '../src/util'

type Item = { id: string }

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

const model = (items: Item[], next: Edge): Model<Item> => ({
  mode: {
    ...defaultMode<Item>(),
    dataSourceId: 'list',
    initial: { _tag: 'Loaded' },
    overallData: SUA.fromArray(eqWithKey, ord)(items),
    next,
  },
  flash: null,
  initialScroll: { _tag: 'Done' },
  scrollContainer: ScrollContainer.init(),
})

const step = (msg: Msg<Item, never, never>, m: Model<Item>) =>
  update<Item, unknown, never, never>(true, config)(null, msg, m)

const send = (msg: Msg<Item, never, never>, m: Model<Item>) => step(msg, m)[0]

describe('a search result highlighted (ScrollToKey)', () => {
  const list = model([{ id: 'a' }, { id: 'b' }], { _tag: 'Exhausted' })

  it('highlights its row, and jumps to it', () => {
    const after = send({ _tag: 'ScrollToKey', key: 'b' }, list)
    expect(after.flash).toEqual({ key: 'b', seq: 1 })
    expect(after.scrollContainer.follow).toMatchObject({
      _tag: 'Navigating',
      target: { _tag: 'Key', key: 'b' },
    })
  })

  it('highlights once: its own timer clears it, not an older one', () => {
    const once = send({ _tag: 'ScrollToKey', key: 'b' }, list)
    const newer = send({ _tag: 'ScrollToKey', key: 'a' }, once)
    // The timer of the first highlight leaves the newer one
    expect(send({ _tag: 'FlashDone', seq: 1 }, newer).flash).toEqual({
      key: 'a',
      seq: 2,
    })
    // Its own timer clears it: the row drawn again later doesn't fade
    expect(send({ _tag: 'FlashDone', seq: 2 }, newer).flash).toBeNull()
  })

  it('clears the highlight after its fade, by a timer, drawn or not', async () => {
    // A row unmounted before its fade ended (a virtualized list scrolled
    // away) never ends its fade: the highlight must end all the same
    vi.useFakeTimers()
    try {
      const [highlighted, cmd] = step({ _tag: 'ScrollToKey', key: 'b' }, list)
      const done: Msg<Item, never, never>[] = []
      cmd.execute((msg) => done.push(msg))
      // As long as the fade of `bg-fade-out`: 2000 ms after 100 ms
      expect(FLASH_MS).toBe(2100)
      await vi.advanceTimersByTimeAsync(FLASH_MS - 1)
      expect(done).toEqual([])
      await vi.advanceTimersByTimeAsync(1)
      expect(done).toEqual([{ _tag: 'FlashDone', seq: 1 }])
      expect(send(done[0], highlighted).flash).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps a second highlight of the same row past the timer of the first', async () => {
    vi.useFakeTimers()
    try {
      const [once, first] = step({ _tag: 'ScrollToKey', key: 'b' }, list)
      const done: Msg<Item, never, never>[] = []
      first.execute((msg) => done.push(msg))
      await vi.advanceTimersByTimeAsync(1000)
      // The same row again, within the fade of the first
      const [twice, second] = step({ _tag: 'ScrollToKey', key: 'b' }, once)
      second.execute((msg) => done.push(msg))
      await vi.advanceTimersByTimeAsync(FLASH_MS - 1000)
      expect(done).toEqual([{ _tag: 'FlashDone', seq: 1 }])
      // The stale timer leaves the second highlight
      const stale = send(done[0], twice)
      expect(stale.flash).toEqual({ key: 'b', seq: 2 })
      await vi.advanceTimersByTimeAsync(1000)
      expect(done.at(-1)).toEqual({ _tag: 'FlashDone', seq: 2 })
      expect(send(done.at(-1)!, stale).flash).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('highlights the same row again with a new number', () => {
    const once = send({ _tag: 'ScrollToKey', key: 'b' }, list)
    const twice = send({ _tag: 'ScrollToKey', key: 'b' }, once)
    expect(twice.flash).toEqual({ key: 'b', seq: 2 })
    const other = send({ _tag: 'ScrollToKey', key: 'a' }, twice)
    expect(other.flash).toEqual({ key: 'a', seq: 3 })
  })
})

describe('the "go to latest" button', () => {
  const view = (
    shown: Partial<ScrollContainer.OverlayView>,
  ): ScrollContainer.OverlayView => ({
    topKey: null,
    isScrolling: false,
    startShown: false,
    endShown: false,
    ...shown,
  })
  const exhausted: Edge = { _tag: 'Exhausted' }
  const idle: Edge = { _tag: 'Idle' }
  const items = [{ id: 'a' }, { id: 'b' }]

  it('goes away when the newest item is loaded and its row is shown', () => {
    // Reversed: the newest row is the last one
    expect(
      isLatestButtonVisible(
        model(items, exhausted),
        true,
        view({ endShown: true }),
      ),
    ).toBe(false)
    // Newest on top: the first one
    expect(
      isLatestButtonVisible(
        model(items, exhausted),
        false,
        view({ startShown: true }),
      ),
    ).toBe(false)
  })

  it('shows while the newest row is out of view', () => {
    expect(
      isLatestButtonVisible(
        model(items, exhausted),
        true,
        view({ startShown: true }),
      ),
    ).toBe(true)
  })

  it('shows while newer items are still to load, even at the last row', () => {
    expect(
      isLatestButtonVisible(model(items, idle), true, view({ endShown: true })),
    ).toBe(true)
  })

  it('does not show for an empty list', () => {
    expect(isLatestButtonVisible(model([], exhausted), true, view({}))).toBe(
      false,
    )
  })
})
