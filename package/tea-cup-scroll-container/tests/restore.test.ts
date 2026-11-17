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
// A stored position put back (`Restore`).
import { describe, expect, it } from 'vitest'

import { chat, command, free, restore, scrollTo, send } from './helper'

describe('a stored position put back (Restore)', () => {
  it('is an instant scroll to the stored row at its stored offset', () => {
    const after = send(
      chat,
      { _tag: 'Restore', anchor: { key: 'm3', offset: -40 }, hide: false },
      free,
    )
    expect(after.follow).toEqual({
      _tag: 'Restoring',
      anchor: { key: 'm3', offset: -40 },
    })
    expect(command(after)).toEqual({
      _tag: 'ScrollToKey',
      key: 'm3',
      offset: -40,
      onlyIfHidden: false,
      // A stored position is from the viewport's top edge, search bar or not
      belowOverlay: false,
      behavior: 'instant',
    })
  })
})

describe('a stored position, other cases', () => {
  it('replaces a scroll of ours in flight', () => {
    const navigating = send(chat, scrollTo({ _tag: 'End' }), free)
    const after = send(chat, restore('m3', 0), navigating)
    expect(after.follow).toEqual({
      _tag: 'Restoring',
      anchor: { key: 'm3', offset: 0 },
    })
    expect(after.pendingAdjust?.seq).toBe(2)
  })

  it('aims again at its row, at its offset, when rows land above it', () => {
    const restoring = send(chat, restore('m3', -40), free)
    const after = send(
      chat,
      {
        _tag: 'ItemsChanged',
        prepended: 24,
        appended: 0,
        removed: 0,
        anchor: null,
      },
      restoring,
    )
    expect(command(after)).toEqual(command(restoring))
    expect(after.pendingAdjust?.seq).toBe(2)
  })
})
