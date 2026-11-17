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
// A scroll of ours asked for by the owner (`ScrollTo`).
import { describe, expect, it } from 'vitest'

import * as SC from '../src'
import {
  atEnd,
  chat,
  command,
  feed,
  free,
  now,
  restore,
  scrollTo,
  send,
  toKey,
} from './helper'

describe('a scroll of ours (ScrollTo)', () => {
  it('navigates to the end and asks the engine to scroll there', () => {
    const after = send(chat, scrollTo({ _tag: 'End' }), free)
    expect(after.follow).toEqual({
      _tag: 'Navigating',
      target: { _tag: 'End' },
      behavior: 'smooth',
      until: now + SC.MAX_NAVIGATE_MS,
    })
    expect(command(after)).toEqual({ _tag: 'ScrollToEnd', behavior: 'smooth' })
  })

  it('navigates to a row with its offset', () => {
    const after = send(chat, scrollTo(toKey('m2'), 'instant'), atEnd)
    expect(command(after)).toEqual({
      _tag: 'ScrollToKey',
      key: 'm2',
      offset: 0,
      onlyIfHidden: false,
      belowOverlay: true,
      behavior: 'instant',
    })
  })

  it('numbers each decision, so the view applies it once', () => {
    const first = send(chat, scrollTo({ _tag: 'End' }), free)
    const second = send(chat, scrollTo({ _tag: 'Start' }), first)
    expect(first.pendingAdjust?.seq).toBe(1)
    expect(second.pendingAdjust?.seq).toBe(2)
    expect(command(second)).toEqual({
      _tag: 'ScrollToStart',
      behavior: 'smooth',
    })
  })
})

describe('a scroll of ours to the start (a feed)', () => {
  it('asks the engine for the start: the newest items of a feed', () => {
    const after = send(feed, scrollTo({ _tag: 'Start' }, 'instant'), free)
    expect(command(after)).toEqual({
      _tag: 'ScrollToStart',
      behavior: 'instant',
    })
    expect(after.follow).toMatchObject({
      _tag: 'Navigating',
      target: { _tag: 'Start' },
    })
  })

  it('replaces a restore in flight', () => {
    const restoring = send(chat, restore('m3', 10), free)
    const after = send(chat, scrollTo({ _tag: 'End' }), restoring)
    expect(after.follow._tag).toBe('Navigating')
    expect(after.pendingAdjust?.seq).toBe(2)
    expect(command(after)).toEqual({ _tag: 'ScrollToEnd', behavior: 'smooth' })
  })

  it('lands a row under the search bar (`belowOverlay`), when it is hidden only if asked', () => {
    const target: SC.Target = {
      _tag: 'Key',
      key: 'm7',
      offset: 0,
      onlyIfHidden: true,
    }
    expect(command(send(chat, scrollTo(target, 'instant'), atEnd))).toEqual({
      _tag: 'ScrollToKey',
      key: 'm7',
      offset: 0,
      onlyIfHidden: true,
      belowOverlay: true,
      behavior: 'instant',
    })
  })
})
