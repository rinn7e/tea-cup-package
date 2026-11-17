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
// A scroll coming to rest (`ScrollSettled`).
import { describe, expect, it } from 'vitest'

import * as SC from '../src'
import {
  atEnd,
  chat,
  command,
  free,
  geometry,
  now,
  scrollTo,
  send,
  settled,
  toKey,
} from './helper'

describe('a scroll coming to rest (ScrollSettled)', () => {
  it('sticks a navigation to the end to the end once there', () => {
    const navigating = send(chat, scrollTo({ _tag: 'End' }), free)
    expect(send(chat, settled(true), navigating).follow).toEqual({
      _tag: 'AtEnd',
    })
  })

  it('holds a jump to a row while rows around it may still grow', () => {
    // Late bodies and images land a second or more after the jump
    const navigating = send(chat, scrollTo(toKey('m2')), free)
    const after = send(chat, settled(false, now + 1_500), navigating)
    expect(after.follow).toEqual(navigating.follow)
    expect(after.geometry).toEqual(geometry)
  })

  it('lets the row go after MAX_NAVIGATE_MS', () => {
    const navigating = send(chat, scrollTo(toKey('m2')), free)
    const later = now + SC.MAX_NAVIGATE_MS + 1
    expect(send(chat, settled(false, later), navigating).follow).toEqual({
      _tag: 'Free',
      anchor: { key: 'm9', offset: 0 },
    })
  })

  it('ends a restore where it landed', () => {
    const restoring = send(
      chat,
      { _tag: 'Restore', anchor: { key: 'm3', offset: 10 }, hide: false },
      free,
    )
    expect(send(chat, settled(false), restoring).follow).toEqual({
      _tag: 'Free',
      anchor: { key: 'm9', offset: 0 },
    })
  })

  it('says where the reader stopped: at the end, or at a row', () => {
    expect(send(chat, settled(true), free).follow).toEqual({ _tag: 'AtEnd' })
    expect(send(chat, settled(false), atEnd).follow).toEqual({
      _tag: 'Free',
      anchor: { key: 'm9', offset: 0 },
    })
  })
})

describe('a scroll coming to rest, other cases', () => {
  it('keeps the follow it had when nothing changed, with the new geometry', () => {
    const after = send(chat, settled(true), atEnd)
    expect(after.follow).toBe(atEnd.follow)
    expect(after.geometry).toEqual(geometry)
  })

  it('sends a navigation to the end that settled short of it on to the end', () => {
    // WebKit stops a smooth scroll when the page resizes (an editor closing
    // after Send): the scroll of ours goes on, as it was asked for
    const navigating = send(chat, scrollTo({ _tag: 'End' }), free)
    const after = send(chat, settled(false), navigating)
    expect(after.follow).toEqual(navigating.follow)
    expect(after.geometry).toEqual(geometry)
    expect(command(after)).toEqual({ _tag: 'ScrollToEnd', behavior: 'smooth' })
    // A new decision, applied again
    expect(after.pendingAdjust).not.toBe(navigating.pendingAdjust)
  })

  it('frees a navigation to the end still short of it after MAX_NAVIGATE_MS', () => {
    const navigating = send(chat, scrollTo({ _tag: 'End' }), free)
    const later = now + SC.MAX_NAVIGATE_MS + 1
    expect(send(chat, settled(false, later), navigating).follow).toEqual({
      _tag: 'Free',
      anchor: { key: 'm9', offset: 0 },
    })
  })

  it('applies no command: settling only says where the position is', () => {
    expect(send(chat, settled(false), atEnd).pendingAdjust).toBeNull()
  })
})
