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
import { type Edge } from './type'

/**
 * Whether a key event goes to a text field (typing, not scrolling)
 */
export const isEditable = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT')

/**
 * The offset a scroll to a row lands it at (its top, from the view's top
 * edge), held inside the row: an offset stored on another layout (a long body
 * expanded then, clamped now, or another width) may be more than the row is
 * tall, and would land the view past it. `rowSize`: the row's size as the
 * engine knows it now (measured, or its estimate), unknown for a row the list
 * doesn't have.
 */
export const boundedOffset = (offset: number, rowSize?: number): number =>
  rowSize === undefined ? offset : Math.max(offset, -(rowSize - 1))

/**
 * The height a row not measured yet is laid out with, by its key: the one it
 * was given first (`kept`, filled here), or the median of the rows measured so
 * far (`measured`), `configured` before any. The median, not the average: a
 * few tall rows (a long HTML message) pull the average far above a typical row
 * (302 px against 173, rows up to 1421 px, on an iPhone). A row keeps its
 * estimate until it is measured: a later median moving it would move every
 * row below it.
 */
export const rowEstimate = <Key>(
  kept: Map<Key, number>,
  measured: ReadonlyMap<Key, number>,
  configured: number,
): ((key: Key) => number) => {
  // Taken once per layout, when a row needs it
  let median: number | null = null
  return (key) => {
    const estimate = kept.get(key)
    if (estimate !== undefined) {
      return estimate
    } else {
      median ??=
        measured.size > 0 ? medianOf(Array.from(measured.values())) : configured
      kept.set(key, median)
      return median
    }
  }
}

// The middle of `values` (not empty), rounded
const medianOf = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return Math.round(
    sorted.length % 2 === 1
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2,
  )
}

/**
 * How the keys changed: rows added before the old first one, after the old
 * last one, and how many went
 */
export const itemsChange = (
  prev: string[],
  next: string[],
): { prepended: number; appended: number; removed: number } => {
  if (prev.length === 0) {
    return { prepended: 0, appended: next.length, removed: 0 }
  } else {
    const firstAt = next.indexOf(prev[0])
    const lastAt = next.indexOf(prev[prev.length - 1])
    const prepended = firstAt > 0 ? firstAt : 0
    const appended = lastAt >= 0 ? next.length - 1 - lastAt : 0
    const removed = Math.max(
      0,
      prev.length + prepended + appended - next.length,
    )
    return { prepended, appended, removed }
  }
}

/**
 * Whether the first row (`end` 'Start') or the last row ('End') of a list
 * counts as shown, by where it is in the layout: it is in the view, and
 * reaches at most `margin` px past the view's edge at that end (the first
 * row's top above the view's top, the last row's bottom below the view's
 * bottom). A short last row at the very end is shown; a tall one counts as
 * shown only while its end is near the bottom
 */
export const isEndRowShown = (
  end: Edge,
  row: { start: number; end: number },
  view: { top: number; bottom: number },
  margin: number,
): boolean => {
  const inView = row.start <= view.bottom && row.end >= view.top
  switch (end) {
    case 'Start':
      return inView && row.start >= view.top - margin
    case 'End':
      return inView && row.end <= view.bottom + margin
  }
}
