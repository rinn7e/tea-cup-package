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
// The view's helpers: how the rows changed, which key events are typing, the
// height a row not measured yet is laid out with, and
// whether the first or the last row counts as shown.
//
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import * as SC from '../src'

describe('how the rows changed (itemsChange)', () => {
  it('counts rows added above and below', () => {
    expect(SC.itemsChange(['c', 'd'], ['a', 'b', 'c', 'd', 'e'])).toEqual({
      prepended: 2,
      appended: 1,
      removed: 0,
    })
  })

  it('counts the first rows as appended', () => {
    expect(SC.itemsChange([], ['a', 'b'])).toEqual({
      prepended: 0,
      appended: 2,
      removed: 0,
    })
  })

  it('counts removed rows', () => {
    expect(SC.itemsChange(['a', 'b', 'c'], ['a', 'c'])).toEqual({
      prepended: 0,
      appended: 0,
      removed: 1,
    })
  })
})

describe('how the rows changed, other cases', () => {
  it('counts nothing when the keys are the same', () => {
    expect(SC.itemsChange(['a', 'b'], ['a', 'b'])).toEqual({
      prepended: 0,
      appended: 0,
      removed: 0,
    })
  })

  it('counts rows added on both ends and removed in between', () => {
    expect(SC.itemsChange(['b', 'c', 'd'], ['a', 'b', 'd', 'e'])).toEqual({
      prepended: 1,
      appended: 1,
      removed: 1,
    })
  })
})

describe('which key events are typing (isEditable)', () => {
  it('counts text fields and editable content as typing', () => {
    const editable = document.createElement('div')
    editable.contentEditable = 'true'
    // jsdom does not compute `isContentEditable`
    Object.defineProperty(editable, 'isContentEditable', { value: true })
    expect(SC.isEditable(document.createElement('input'))).toBe(true)
    expect(SC.isEditable(document.createElement('textarea'))).toBe(true)
    expect(SC.isEditable(document.createElement('select'))).toBe(true)
    expect(SC.isEditable(editable)).toBe(true)
  })

  it('counts anything else as navigation', () => {
    expect(SC.isEditable(document.createElement('div'))).toBe(false)
    expect(SC.isEditable(document.body)).toBe(false)
    expect(SC.isEditable(null)).toBe(false)
  })
})

describe('whether the first or the last row counts as shown (isEndRowShown)', () => {
  // The view: 600 px, from 400 to 1000 in the layout
  const view = { top: 400, bottom: 1000 }

  it('counts a short last row at the very end as shown', () => {
    // Shorter than the margin: its top never gets 84 px above the bottom
    expect(SC.isEndRowShown('End', { start: 950, end: 1000 }, view, 84)).toBe(
      true,
    )
  })

  it('counts the last row as shown while its end is near the bottom', () => {
    expect(SC.isEndRowShown('End', { start: 500, end: 1050 }, view, 84)).toBe(
      true,
    )
    // Further than the margin below the view: the reader scrolled away
    expect(SC.isEndRowShown('End', { start: 500, end: 1200 }, view, 84)).toBe(
      false,
    )
  })

  it('does not count a row well below the view', () => {
    expect(SC.isEndRowShown('End', { start: 1200, end: 1250 }, view, 84)).toBe(
      false,
    )
  })

  it('counts the first row the same way at the top', () => {
    expect(SC.isEndRowShown('Start', { start: 400, end: 450 }, view, 84)).toBe(
      true,
    )
    expect(SC.isEndRowShown('Start', { start: 350, end: 900 }, view, 84)).toBe(
      true,
    )
    expect(SC.isEndRowShown('Start', { start: 100, end: 900 }, view, 84)).toBe(
      false,
    )
    expect(SC.isEndRowShown('Start', { start: 100, end: 200 }, view, 84)).toBe(
      false,
    )
  })
})

describe('the offset a scroll to a row lands it at (boundedOffset)', () => {
  it('keeps an offset that lands inside the row', () => {
    expect(SC.boundedOffset(-120, 500)).toBe(-120)
    expect(SC.boundedOffset(40, 500)).toBe(40)
  })

  it('holds an offset stored on a taller row inside the row now', () => {
    // Read 3000 px into a body expanded then, clamped to 500 px now: the row
    // stays in view (its last pixel at the top), not 2500 px past it
    expect(SC.boundedOffset(-3000, 500)).toBe(-499)
  })

  it('keeps the offset when the row size is unknown', () => {
    expect(SC.boundedOffset(-3000)).toBe(-3000)
  })
})

describe('the height of a row not measured yet (rowEstimate)', () => {
  it('is the configured estimate before any row is measured', () => {
    const estimate = SC.rowEstimate(new Map(), new Map(), 400)
    expect(estimate('a')).toBe(400)
  })

  it('is the median of the rows measured so far', () => {
    const measured = new Map([
      ['a', 100],
      ['b', 200],
      ['c', 150],
    ])
    const estimate = SC.rowEstimate(new Map(), measured, 400)
    expect(estimate('x')).toBe(150)
  })

  it('is not pulled up by a few tall rows', () => {
    // A long HTML message among short ones
    const measured = new Map([
      ['a', 150],
      ['b', 170],
      ['c', 160],
      ['d', 1421],
    ])
    expect(SC.rowEstimate(new Map(), measured, 400)('x')).toBe(165)
  })

  it('stays what a row was first given until it is measured', () => {
    // A later median moving it would move every row below it
    const kept = new Map<string, number>()
    const measured = new Map([['a', 100]])
    expect(SC.rowEstimate(kept, measured, 400)('x')).toBe(100)
    measured.set('b', 300)
    const later = SC.rowEstimate(kept, measured, 400)
    expect(later('x')).toBe(100)
    expect(later('y')).toBe(200)
  })
})
