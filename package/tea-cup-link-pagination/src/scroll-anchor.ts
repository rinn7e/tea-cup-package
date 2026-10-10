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
/**
 * Keeping the reading position still while the list changes.
 *
 * The list keeps whatever the user is looking at in place, like CSS scroll
 * anchoring, but by itself: the container sets `overflow-anchor: none`, so every
 * browser runs the same code (WebKit has no `overflow-anchor` at all) and the
 * browser never corrects on top of it.
 *
 * Two cases:
 *
 * - A commit changes the rows (an older page prepended, an item inserted or
 *   removed above the view, cached rows replaced by the API's). Before React
 *   touches the DOM, the scroll port reads the first visible rows and their
 *   offset from the container top (`pickAnchorCandidates`); right after, before
 *   paint, it puts the first one still there back at its offset
 *   (`restoreScrollTop`). The positions are measured, never derived from an
 *   earlier scroll height, so growth that happened without a scroll event (an
 *   image, a font) cannot skew it.
 * - A row changes height on its own after it was rendered (a late image in a
 *   page that now sits above the view). A ResizeObserver moves `scrollTop` by
 *   the growth of rows wholly above the view (`resizeAdjustment`).
 *
 * The functions here are pure; the DOM side is in `scroll-port.tsx`.
 */

// A row's box relative to the container's top edge, in px.
export type RowBox = { key: string; top: number; bottom: number }

// A visible row and where its top edge was, relative to the container's top.
export type AnchorCandidate = { key: string; offset: number }

// How many visible rows to remember: the first one still in the list after
// the commit is the anchor, so a removed top row falls back to the next.
export const anchorCandidateLimit = 3

/**
 * The rows in view (at least partly), top first, with their offsets.
 * `viewportHeight` is the container's `clientHeight`.
 */
export const pickAnchorCandidates = (
  rows: RowBox[],
  viewportHeight: number,
): AnchorCandidate[] =>
  rows
    .filter((row) => row.bottom > 0 && row.top < viewportHeight)
    .sort((first, second) => first.top - second.top)
    .slice(0, anchorCandidateLimit)
    .map((row) => ({ key: row.key, offset: row.top }))

/**
 * The `scrollTop` that puts the first surviving candidate back at its offset.
 * `rowTopOf` gives a row's current top relative to the container's top, or
 * `undefined` when the row is gone. With no candidate left, the position stays.
 */
export const restoreScrollTop = (
  candidates: AnchorCandidate[],
  rowTopOf: (key: string) => number | undefined,
  scrollTop: number,
): number => {
  const [candidate, ...rest] = candidates
  if (candidate === undefined) {
    return scrollTop
  } else {
    const top = rowTopOf(candidate.key)
    if (top === undefined) {
      return restoreScrollTop(rest, rowTopOf, scrollTop)
    } else {
      return scrollTop + (top - candidate.offset)
    }
  }
}

/**
 * By how much `scrollTop` must move for a row whose height went from
 * `prevHeight` to `newHeight`, its bottom edge now at `rowBottom` relative to
 * the container's top. Only a row wholly above the view counts: a row across
 * the top edge may have grown in its visible part, which should push the rows
 * below it down.
 */
export const resizeAdjustment = (
  prevHeight: number | undefined,
  newHeight: number,
  rowBottom: number,
): number => {
  if (prevHeight === undefined) {
    return 0
  } else {
    const delta = newHeight - prevHeight
    // `rowBottom` is measured after the resize: the row was wholly above the
    // view when its old bottom was at or above the container's top.
    const oldBottom = rowBottom - delta
    return delta !== 0 && oldBottom <= 0.5 ? delta : 0
  }
}

// Changes smaller than this are layout rounding, not a move: leaving
// `scrollTop` alone also keeps a running momentum scroll going.
export const scrollEpsilon = 0.5
