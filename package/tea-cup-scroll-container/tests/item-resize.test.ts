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
// A row resizing: `adjustOnItemResize`, which the engine asks in its resize
// callback (no message: it decides before paint).
import { describe, expect, it } from 'vitest'

import * as SC from '../src'
import {
  atEnd,
  chat,
  free,
  now,
  restore,
  scrollTo,
  send,
  settled,
  toKey,
} from './helper'

describe('a row resizing (adjustOnItemResize, asked by the engine)', () => {
  it("follows the engine's rule (a row above the view) by default", () => {
    expect(SC.adjustOnItemResize(chat, 3, null, true)).toBe(true)
    expect(SC.adjustOnItemResize(chat, 3, null, false)).toBe(false)
  })

  it('keeps the held row still: rows above it move the position', () => {
    // A row right above the jump's target, partly in view under the search
    // bar, grows: the engine's own rule would let the target move
    expect(SC.adjustOnItemResize(chat, 4, 5, false)).toBe(true)
    expect(SC.adjustOnItemResize(chat, 6, 5, true)).toBe(false)
  })

  it('never moves with `onItemResize: none`', () => {
    const none: SC.Config = { ...chat, onItemResize: 'none' }
    expect(SC.adjustOnItemResize(none, 3, 5, true)).toBe(false)
  })

  it('holds the row of a navigation or a restore, not the end', () => {
    expect(SC.heldKey(send(chat, scrollTo(toKey('m2')), free))).toBe('m2')
    expect(SC.heldKey(send(chat, scrollTo({ _tag: 'End' }), free))).toBeNull()
    expect(
      SC.heldKey(
        send(
          chat,
          { _tag: 'Restore', anchor: { key: 'm3', offset: 0 }, hide: false },
          free,
        ),
      ),
    ).toBe('m3')
    expect(SC.heldKey(atEnd)).toBeNull()
  })
})

describe('a row resizing, held rows', () => {
  it('holds the row of a restore: rows above it move the position', () => {
    const restoring = send(chat, restore('m3', 0), free)
    expect(SC.heldKey(restoring)).toBe('m3')
    expect(SC.adjustOnItemResize(chat, 1, 3, false)).toBe(true)
  })

  it('holds no row once the jump settled past its time', () => {
    const navigating = send(chat, scrollTo(toKey('m2')), free)
    const later = send(
      chat,
      settled(false, now + SC.MAX_NAVIGATE_MS + 1),
      navigating,
    )
    expect(SC.heldKey(later)).toBeNull()
  })
})
