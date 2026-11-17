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
// The reader taking over (`ReaderScrolled`).
import { describe, expect, it } from 'vitest'

import type * as SC from '../src'
import { atEnd, chat, command, free, scrollTo, send, toKey } from './helper'

describe('the reader taking over (ReaderScrolled)', () => {
  const reader: SC.Msg = { _tag: 'ReaderScrolled', input: 'wheel' }

  it('stops a scroll of ours where it is', () => {
    const navigating = send(chat, scrollTo(toKey('m2')), free)
    const after = send(chat, reader, navigating)
    expect(after.follow).toEqual({ _tag: 'Free', anchor: null })
    expect(command(after)).toEqual({ _tag: 'Cancel' })
  })

  it('stops a restore too', () => {
    const restoring = send(
      chat,
      { _tag: 'Restore', anchor: { key: 'm3', offset: 10 }, hide: false },
      free,
    )
    expect(command(send(chat, reader, restoring))).toEqual({ _tag: 'Cancel' })
  })

  it('frees a list at its end, without moving it', () => {
    const after = send(chat, reader, atEnd)
    expect(after.follow).toEqual({ _tag: 'Free', anchor: null })
    expect(after.pendingAdjust).toBeNull()
  })

  it('changes nothing for a list already free: the same model', () => {
    expect(send(chat, reader, free)).toBe(free)
  })
})

describe('every kind of reader input', () => {
  it.each(['wheel', 'touch', 'key', 'pointer'] as const)(
    'takes over from a scroll of ours by %s',
    (input) => {
      const navigating = send(chat, scrollTo({ _tag: 'End' }), free)
      expect(
        command(send(chat, { _tag: 'ReaderScrolled', input }, navigating)),
      ).toEqual({ _tag: 'Cancel' })
    },
  )
})
