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
import { describe, expect, it } from 'vitest'

import {
  anchorCandidateLimit,
  pickAnchorCandidates,
  resizeAdjustment,
  restoreScrollTop,
} from '../src/scroll-anchor'

describe('pickAnchorCandidates', () => {
  const rows = [
    { key: 'c', top: 300, bottom: 400 },
    { key: 'above', top: -200, bottom: -1 },
    { key: 'a', top: -50, bottom: 100 },
    { key: 'b', top: 100, bottom: 300 },
    { key: 'below', top: 600, bottom: 700 },
    { key: 'd', top: 400, bottom: 500 },
  ]

  it('takes the rows in view, top first, with their offsets', () => {
    expect(pickAnchorCandidates(rows, 600)).toEqual([
      { key: 'a', offset: -50 },
      { key: 'b', offset: 100 },
      { key: 'c', offset: 300 },
    ])
  })

  it(`keeps at most ${anchorCandidateLimit} rows`, () => {
    expect(pickAnchorCandidates(rows, 600)).toHaveLength(anchorCandidateLimit)
  })

  it('has nothing to anchor to in an empty view', () => {
    expect(pickAnchorCandidates([], 600)).toEqual([])
  })
})

describe('restoreScrollTop', () => {
  const candidates = [
    { key: 'a', offset: 10 },
    { key: 'b', offset: 120 },
  ]

  it('moves by how far the anchor row moved', () => {
    // An older page of 400px was prepended above `a`.
    expect(restoreScrollTop(candidates, () => 410, 0)).toBe(400)
    // A row above `a` was removed: `a` moved up by 80px.
    expect(restoreScrollTop(candidates, () => -70, 500)).toBe(420)
  })

  it('stays when the anchor row did not move', () => {
    expect(restoreScrollTop(candidates, () => 10, 250)).toBe(250)
  })

  it('falls back to the next row when the anchor row is gone', () => {
    const rowTopOf = (key: string) => (key === 'b' ? 170 : undefined)
    expect(restoreScrollTop(candidates, rowTopOf, 100)).toBe(150)
  })

  it('stays when no candidate is left', () => {
    expect(restoreScrollTop(candidates, () => undefined, 100)).toBe(100)
    expect(restoreScrollTop([], () => 0, 100)).toBe(100)
  })
})

describe('resizeAdjustment', () => {
  it('follows a row wholly above the view', () => {
    // Grew 50 -> 300; its bottom is now at -10, so it was at -260.
    expect(resizeAdjustment(50, 300, -10)).toBe(250)
    // A grown row whose old bottom was exactly at the top edge counts.
    expect(resizeAdjustment(50, 300, 250)).toBe(250)
    // Shrank 300 -> 50; its bottom is now at -300, so it was at -50.
    expect(resizeAdjustment(300, 50, -300)).toBe(-250)
  })

  it('leaves a row across the top edge or below alone', () => {
    // Old bottom at 40: the row reached into the view.
    expect(resizeAdjustment(50, 300, 290)).toBe(0)
    expect(resizeAdjustment(50, 300, 900)).toBe(0)
  })

  it('ignores the first measurement and no change', () => {
    expect(resizeAdjustment(undefined, 300, -10)).toBe(0)
    expect(resizeAdjustment(300, 300, -10)).toBe(0)
  })
})
