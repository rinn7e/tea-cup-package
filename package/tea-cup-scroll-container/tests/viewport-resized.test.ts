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
// The viewport changing height (`ViewportResized`): the on-screen keyboard,
// an editor below the list.
import { describe, expect, it } from 'vitest'

import type * as SC from '../src'
import {
  atEnd,
  chat,
  command,
  feed,
  free,
  geometry,
  restore,
  scrollTo,
  send,
  settled,
} from './helper'

describe('the viewport resizing (ViewportResized)', () => {
  const resized = (prev: number, next: number): SC.Msg => ({
    _tag: 'ViewportResized',
    prev,
    next,
  })

  it('keeps a chat at its end at its end (the keyboard opens)', () => {
    const after = send(chat, resized(800, 500), atEnd)
    expect(command(after)).toEqual({
      _tag: 'ScrollToEnd',
      behavior: 'instant',
    })
    expect(after.follow).toEqual({ _tag: 'AtEnd' })
  })

  it("keeps a free chat's bottom line, by the change", () => {
    expect(command(send(chat, resized(800, 500), free))).toEqual({
      _tag: 'ScrollBy',
      delta: 300,
    })
    // Growing back (the keyboard closes) moves it back up
    expect(command(send(chat, resized(500, 800), free))).toEqual({
      _tag: 'ScrollBy',
      delta: -300,
    })
  })

  it('leaves a scroll of ours alone: the engine re-aims from the new size', () => {
    // The bug of MR !1390: the editor closing after Send resized the list,
    // and the offset written for it stopped the smooth scroll halfway
    const navigating = send(chat, scrollTo({ _tag: 'End' }), free)
    const after = send(chat, resized(500, 800), navigating)
    expect(after.pendingAdjust).toEqual(navigating.pendingAdjust)
    expect(after.follow).toEqual(navigating.follow)
  })

  it('moves nothing for a feed, which keeps its top line', () => {
    expect(send(feed, resized(800, 500), free).pendingAdjust).toBeNull()
  })

  it('moves nothing when only the width changed', () => {
    expect(send(chat, resized(800, 800), atEnd).pendingAdjust).toBeNull()
  })
})

describe('the viewport resizing, other policies and states', () => {
  const resized: SC.Msg = { _tag: 'ViewportResized', prev: 800, next: 500 }

  it('moves nothing with `keepAnchor`: the row at the top stays by itself', () => {
    const anchored: SC.Config = { ...chat, onViewportResize: 'keepAnchor' }
    expect(send(anchored, resized, free).pendingAdjust).toBeNull()
    expect(send(anchored, resized, atEnd).pendingAdjust).toBeNull()
  })

  it('leaves a restore alone: the engine re-aims at its row', () => {
    const restoring = send(chat, restore('m3', 10), free)
    const after = send(chat, resized, restoring)
    expect(after.pendingAdjust).toEqual(restoring.pendingAdjust)
  })

  it('keeps the known geometry up to date', () => {
    const seen = send(chat, settled(false), free)
    expect(send(chat, resized, seen).geometry).toEqual({
      ...geometry,
      clientHeight: 500,
    })
  })
})
