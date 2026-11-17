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
// A list's reading position is kept in one place, the `ScrollStateMap` in an
// `IORef`, as an anchor: the row at the top of the view and its top, as the
// scroll container reports it (`onAnchor`). Restoring it lands on the same
// item after rows above it changed, which a stored `scrollTop` didn't.
import * as ScrollContainer from '@rinn7e/tea-cup-scroll-container'
import { describe, expect, it } from 'vitest'

import {
  newScrollStateRef,
  storeScrollState,
} from '../src/common/type/scroll-state-map'
import { scrollToCurrentHandler, scrollToNewestHandler } from '../src/handler'
import { emptyModel, restoreSavedScroll, setSelectedKey } from '../src/helper'
import {
  type Edge,
  type LogicConfig,
  type Mode,
  defaultMode,
} from '../src/type'
import { init } from '../src/update'

const dataSourceId = 'list'

describe('the reading position', () => {
  it('is the anchor the scroll container reports, stored per data source', () => {
    const ref = newScrollStateRef()
    const store = storeScrollState(ref)(dataSourceId, {
      key: 'b',
      offset: -20,
    })
    // Nothing is stored until the effect runs
    expect(ref.read().size).toBe(0)
    store()
    expect(ref.read().get(dataSourceId)).toEqual({ key: 'b', top: -20 })
    expect(ref.read().get('other')).toBeUndefined()
  })

  it("is stored by the list's `onAnchor`, under its data source", () => {
    // The owner passes `storeScrollState(ref)` to `init`; the list's view
    // hands it every anchor its scroll container reports
    const ref = newScrollStateRef()
    const mode: Mode<{ id: string }> = { ...defaultMode(), dataSourceId }
    const [model] = init(true, mode, storeScrollState(ref))
    model.onAnchor?.(dataSourceId, { key: 'a', offset: -5 })()
    expect(ref.read().get(dataSourceId)).toEqual({ key: 'a', top: -5 })
  })
})

describe('restoring a list shown again', () => {
  const exhausted: Edge = { _tag: 'Exhausted' }
  const model = setSelectedKey('a')(
    emptyModel({
      ...defaultMode<{ id: string }>(),
      dataSourceId,
      prev: exhausted,
      next: exhausted,
    }),
  )

  it('hides the list until it is back at its position', () => {
    const ref = newScrollStateRef()
    ref.write(new Map([[dataSourceId, { key: 'a', top: 0 }]]))()
    const [after] = restoreSavedScroll(ref, { resetEdges: false })(model)
    expect(ScrollContainer.isPlacing(after.scrollContainer)).toBe(true)
    expect(after.mode.selectedKey).toBe('a')
  })

  it('has the scroll container put the stored row back at its top', () => {
    // Kept by the item: it lands on the same row after rows above it changed
    const ref = newScrollStateRef()
    ref.write(new Map([[dataSourceId, { key: 'a', top: -40 }]]))()
    const [after] = restoreSavedScroll(ref, { resetEdges: false })(model)
    expect(after.scrollContainer.follow).toEqual({
      _tag: 'Restoring',
      anchor: { key: 'a', offset: -40 },
    })
    expect(after.scrollContainer.pendingAdjust?.command).toEqual({
      _tag: 'ScrollToKey',
      key: 'a',
      offset: -40,
      onlyIfHidden: false,
      belowOverlay: false,
      behavior: 'instant',
    })
  })

  it('does nothing without a stored position', () => {
    const [after] = restoreSavedScroll(newScrollStateRef(), {
      resetEdges: false,
    })(model)
    expect(after).toEqual(model)
  })

  // A list opened again: a scroll of the fresh list before its restore
  // (one of ours putting it in place) must not overwrite the position the
  // restore brings back. The scroll container reports no anchor while the
  // list is placed (`placing`), and the one it lands on once placed.
  it('places the list hidden, so a scroll before its restore stores nothing', () => {
    const ref = newScrollStateRef()
    ref.write(new Map([[dataSourceId, { key: 'b', top: 10 }]]))()
    const [waiting] = restoreSavedScroll(ref, { resetEdges: false })({
      ...model,
      onAnchor: storeScrollState(ref),
    })
    expect(ScrollContainer.isPlacing(waiting.scrollContainer)).toBe(true)
    // The scroll container puts `b` back at 10
    expect(waiting.scrollContainer.follow).toEqual({
      _tag: 'Restoring',
      anchor: { key: 'b', offset: 10 },
    })
  })

  it('places the list hidden while a scroll to an item puts it in place', () => {
    const [scrolling] = scrollToCurrentHandler(
      { isReversed: true } as LogicConfig<{ id: string }, unknown, never>,
      { isGraceful: false },
    )(model)
    expect(ScrollContainer.isPlacing(scrolling.scrollContainer)).toBe(true)
  })

  it('reopens the ends only when asked (the full list, not a preview of it)', () => {
    const ref = newScrollStateRef()
    const [reset] = restoreSavedScroll(ref, { resetEdges: true })(model)
    expect(reset.mode.prev).toEqual({ _tag: 'Idle' })
    expect(reset.mode.next).toEqual({ _tag: 'Idle' })
    const [kept] = restoreSavedScroll(ref, { resetEdges: false })(model)
    expect(kept.mode.next).toEqual(exhausted)
  })
})

describe('scrolling to the newest item', () => {
  const model = emptyModel({ ...defaultMode<{ id: string }>(), dataSourceId })
  const commandOf = (isReversed: boolean, behavior?: 'smooth' | 'instant') =>
    scrollToNewestHandler(
      { isReversed } as LogicConfig<{ id: string }, unknown, never>,
      model,
      behavior,
    )[0].scrollContainer.pendingAdjust?.command

  it('scrolls smoothly to the end of a reversed list unless asked otherwise', () => {
    expect(commandOf(true)).toEqual({ _tag: 'ScrollToEnd', behavior: 'smooth' })
    expect(commandOf(true, 'instant')).toEqual({
      _tag: 'ScrollToEnd',
      behavior: 'instant',
    })
  })

  it('scrolls to the start of a list with its newest items on top', () => {
    expect(commandOf(false)).toEqual({
      _tag: 'ScrollToStart',
      behavior: 'smooth',
    })
  })
})
