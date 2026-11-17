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
// Rows added or removed (`ItemsChanged`).
import { describe, expect, it } from 'vitest'

import type * as SC from '../src'
import {
  atEnd,
  chat,
  command,
  feed,
  free,
  scrollTo,
  send,
  toKey,
} from './helper'

describe('rows added (ItemsChanged)', () => {
  const appended: SC.Msg = {
    _tag: 'ItemsChanged',
    prepended: 0,
    appended: 1,
    removed: 0,
    anchor: { key: 'm4', offset: -20 },
  }

  it('keeps the position for a new row at the end, even at the end', () => {
    // The end of the rows loaded is not always the newest one: a page lands
    // below a reader resting at the end of the rows loaded. The owner scrolls
    // to a row the reader adds (`ScrollTo`). The list is no longer at its
    // end: the position is the reader's, at the row at the top, so a smaller
    // viewport later keeps its bottom line instead of jumping to the new end
    const after = send(chat, appended, atEnd)
    expect(command(after)).toBe(null)
    expect(after.follow).toEqual({
      _tag: 'Free',
      anchor: { key: 'm4', offset: -20 },
    })
    const shrunk = send(
      chat,
      { _tag: 'ViewportResized', prev: 800, next: 500 },
      after,
    )
    expect(command(shrunk)).toEqual({ _tag: 'ScrollBy', delta: 300 })
  })

  it('keeps it when the reader reads above', () => {
    expect(send(chat, appended, free)).toBe(free)
  })

  it('does not follow it in a feed either', () => {
    const after = send(feed, appended, atEnd)
    expect(command(after)).toBe(null)
    expect(after.follow._tag).toBe('Free')
  })

  it('aims a scroll of ours to a row again when rows land above it', () => {
    // The engine aims at the row's index, which the new rows give to another
    // row: the scroll goes again by key, as it was asked for
    const prepended: SC.Msg = {
      _tag: 'ItemsChanged',
      prepended: 24,
      appended: 0,
      removed: 0,
      anchor: null,
    }
    const navigating = send(chat, scrollTo(toKey('m2'), 'smooth'), free)
    const again = send(chat, prepended, navigating)
    expect(again.pendingAdjust?.seq).toBe(2)
    expect(command(again)).toEqual(command(navigating))
    const restoring = send(
      chat,
      { _tag: 'Restore', anchor: { key: 'm3', offset: -40 }, hide: false },
      free,
    )
    expect(command(send(chat, prepended, restoring))).toEqual({
      _tag: 'ScrollToKey',
      key: 'm3',
      offset: -40,
      onlyIfHidden: false,
      // A stored position is from the viewport's top edge, search bar or not
      belowOverlay: false,
      behavior: 'instant',
    })
  })

  it('leaves rows added above to the engine (its reading anchor)', () => {
    const prepended: SC.Msg = {
      _tag: 'ItemsChanged',
      prepended: 20,
      appended: 0,
      removed: 0,
      anchor: null,
    }
    expect(send(chat, prepended, free)).toBe(free)
    expect(send(chat, prepended, atEnd)).toBe(atEnd)
  })
})

describe('rows changed, other cases', () => {
  const change = (
    prepended: number,
    appended: number,
    removed: number,
  ): SC.Msg => ({
    _tag: 'ItemsChanged',
    prepended,
    appended,
    removed,
    anchor: null,
  })

  it('aims a scroll of ours to a row again when rows above it leave', () => {
    // An SSE delete above the row: the row's index goes to another row
    const navigating = send(chat, scrollTo(toKey('m2'), 'smooth'), free)
    const again = send(chat, change(0, 0, 1), navigating)
    expect(again.pendingAdjust).not.toBe(navigating.pendingAdjust)
    expect(command(again)).toEqual(command(navigating))
  })

  it('does nothing for rows removed', () => {
    expect(send(chat, change(0, 0, 3), atEnd)).toBe(atEnd)
  })

  it('adds nothing to a scroll of ours to the end: it follows the end itself', () => {
    const navigating = send(chat, scrollTo({ _tag: 'End' }), free)
    expect(send(chat, change(0, 1, 0), navigating)).toBe(navigating)
  })

  it('aims again with the row target as asked (only if hidden)', () => {
    const target: SC.Target = {
      _tag: 'Key',
      key: 'm2',
      offset: 0,
      onlyIfHidden: true,
    }
    const navigating = send(chat, scrollTo(target, 'instant'), free)
    expect(command(send(chat, change(24, 0, 0), navigating))).toMatchObject({
      _tag: 'ScrollToKey',
      key: 'm2',
      onlyIfHidden: true,
    })
  })
})
