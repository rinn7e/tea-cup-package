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
// The list hidden while a scroll of ours puts it in place (`placing`), and
// shown again by that scroll's `Placed`.
import { describe, expect, it } from 'vitest'

import * as SC from '../src'
import { chat, free, now, send } from './helper'

const hiddenTo = (target: SC.Target): SC.Msg => ({
  _tag: 'ScrollTo',
  target,
  behavior: 'instant',
  now,
  hide: true,
})

describe('a scroll of ours that hides the list', () => {
  it('records the decision that hid it', () => {
    const after = send(chat, hiddenTo({ _tag: 'End' }), free)
    expect(after.placing).toBe(after.pendingAdjust?.seq)
    expect(SC.isPlacing(after)).toBe(true)
  })

  it('does not hide the list when not asked to', () => {
    const after = send(
      chat,
      {
        _tag: 'ScrollTo',
        target: { _tag: 'End' },
        behavior: 'smooth',
        now,
        hide: false,
      },
      free,
    )
    expect(after.placing).toBeNull()
  })

  it('hides it for a restore too', () => {
    const after = send(
      chat,
      { _tag: 'Restore', anchor: { key: 'm3', offset: -40 }, hide: true },
      free,
    )
    expect(after.placing).toBe(after.pendingAdjust?.seq)
  })

  it('keeps it hidden through a newer decision that does not hide', () => {
    const hidden = send(chat, hiddenTo({ _tag: 'End' }), free)
    const after = send(
      chat,
      { _tag: 'ViewportResized', prev: 800, next: 500 },
      { ...hidden, follow: { _tag: 'AtEnd' } },
    )
    expect(after.pendingAdjust?.seq).toBe(2)
    expect(after.placing).toBe(1)
  })
})

describe('Placed', () => {
  it('shows the list again for its own decision', () => {
    const hidden = send(chat, hiddenTo({ _tag: 'End' }), free)
    const seq = hidden.placing!
    const after = send(chat, { _tag: 'Placed', seq }, hidden)
    expect(after.placing).toBeNull()
    expect(SC.isPlacing(after)).toBe(false)
  })

  it('leaves the list hidden by a newer hiding decision', () => {
    const first = send(chat, hiddenTo({ _tag: 'End' }), free)
    const second = send(
      chat,
      hiddenTo({ _tag: 'Key', key: 'm3', offset: 0, onlyIfHidden: true }),
      first,
    )
    expect(second.placing).toBe(2)
    // The first scroll's frame comes: the second still puts the list in place
    const early = send(chat, { _tag: 'Placed', seq: 1 }, second)
    expect(early).toBe(second)
    const done = send(chat, { _tag: 'Placed', seq: 2 }, early)
    expect(done.placing).toBeNull()
  })

  it('changes nothing for a list not hidden', () => {
    expect(send(chat, { _tag: 'Placed', seq: 1 }, free)).toBe(free)
  })
})

describe('EdgeShown', () => {
  it("is the owner's: the container's model stays as it is", () => {
    expect(send(chat, { _tag: 'EdgeShown', edge: 'Start' }, free)).toBe(free)
  })
})
