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
import { Component, type ReactNode } from 'react'

import {
  type AnchorCandidate,
  type RowBox,
  pickAnchorCandidates,
  resizeAdjustment,
  restoreScrollTop,
  scrollEpsilon,
} from './scroll-anchor'

// Elements whose height changes are compensated: the item rows and the
// load-more ends (their trigger, spinner and retry differ in height).
export const resizeObservedSelector =
  '.custom-ui-wrapper, [data-link-pagin-edge]'

type ScrollPortProps = {
  containerRef: { current: HTMLDivElement | null }
  itemRefs: { current: { [Key: string]: HTMLDivElement | null } }
  className: string
  dataSourceId: string
  onScroll: () => void
  onScrollEnd: () => void
  children: ReactNode
}

/**
 * The list's scroll container. It keeps the reading position still across
 * every commit and every late row resize (see `scroll-anchor.ts`).
 *
 * A class component because only `getSnapshotBeforeUpdate` can read the DOM
 * after React rendered and before it changes the DOM; the restore in
 * `componentDidUpdate` then runs before paint. A Cmd would be too late:
 * react-tea-cup runs Cmds after the frame is painted, so the jump would show.
 */
export class ScrollPort extends Component<
  ScrollPortProps,
  object,
  AnchorCandidate[]
> {
  private resizeHold: ResizeHold = noResizeHold

  componentDidMount() {
    const container = this.props.containerRef.current
    if (container) {
      this.resizeHold = installResizeHold(container)
    }
  }

  componentWillUnmount() {
    this.resizeHold.teardown()
  }

  getSnapshotBeforeUpdate(): AnchorCandidate[] {
    const container = this.props.containerRef.current
    if (container) {
      return pickAnchorCandidates(
        measureRows(container, this.props.itemRefs.current),
        container.clientHeight,
      )
    } else {
      return []
    }
  }

  componentDidUpdate(
    _prevProps: ScrollPortProps,
    _prevState: object,
    candidates: AnchorCandidate[],
  ) {
    const container = this.props.containerRef.current
    if (container && candidates.length > 0) {
      const containerTop = container.getBoundingClientRect().top
      const itemRefs = this.props.itemRefs.current
      const target = restoreScrollTop(
        candidates,
        (key) => {
          const row = itemRefs[key]
          return row && row.isConnected
            ? row.getBoundingClientRect().top - containerTop
            : undefined
        },
        container.scrollTop,
      )
      if (Math.abs(target - container.scrollTop) > scrollEpsilon) {
        container.scrollTop = target
      }
    }
    // The restore already covered height changes made by this commit; the
    // resize hold must not apply them a second time.
    this.resizeHold.recordHeights()
  }

  render() {
    return (
      <div
        ref={this.props.containerRef}
        data-link-pagin-container={this.props.dataSourceId}
        onScroll={this.props.onScroll}
        onScrollEnd={this.props.onScrollEnd}
        className={this.props.className}
      >
        {this.props.children}
      </div>
    )
  }
}

const measureRows = (
  container: HTMLElement,
  itemRefs: { [Key: string]: HTMLDivElement | null },
): RowBox[] => {
  const containerTop = container.getBoundingClientRect().top
  return Object.entries(itemRefs).flatMap(([key, row]) => {
    if (row && row.isConnected) {
      const rect = row.getBoundingClientRect()
      return [
        {
          key,
          top: rect.top - containerTop,
          bottom: rect.bottom - containerTop,
        },
      ]
    } else {
      return []
    }
  })
}

// Whether the browser anchors this container itself. The container sets
// `overflow-anchor: none`; if a stylesheet left it on, the browser already
// handles row resizes and a second correction would double them.
const nativeScrollAnchoringActive = (container: Element): boolean =>
  (
    getComputedStyle(container) as CSSStyleDeclaration & {
      overflowAnchor?: string
    }
  ).overflowAnchor === 'auto'

type ResizeHold = {
  // Take the current heights as the baseline for the next resize.
  recordHeights: () => void
  teardown: () => void
}

const noResizeHold: ResizeHold = {
  recordHeights: () => {},
  teardown: () => {},
}

const heightOf = (row: Element): number => row.getBoundingClientRect().height

/**
 * Watch every row (now and added later) and, when one wholly above the view
 * changes height, move `scrollTop` by as much, before paint.
 */
const installResizeHold = (container: HTMLElement): ResizeHold => {
  if (
    typeof ResizeObserver === 'undefined' ||
    typeof MutationObserver === 'undefined' ||
    nativeScrollAnchoringActive(container)
  ) {
    return noResizeHold
  } else {
    const heights = new WeakMap<Element, number>()

    const resizeObserver = new ResizeObserver((entries) => {
      const containerTop = container.getBoundingClientRect().top
      const adjustment = entries.reduce((sum, entry) => {
        const row = entry.target
        const newHeight = heightOf(row)
        const prevHeight = heights.get(row)
        heights.set(row, newHeight)
        if (row.isConnected) {
          const rowBottom = row.getBoundingClientRect().bottom - containerTop
          return sum + resizeAdjustment(prevHeight, newHeight, rowBottom)
        } else {
          return sum
        }
      }, 0)
      if (Math.abs(adjustment) > scrollEpsilon) {
        container.scrollTop += adjustment
      }
    })

    const observed = new Set<Element>()
    const sync = () => {
      container.querySelectorAll(resizeObservedSelector).forEach((row) => {
        if (!observed.has(row)) {
          observed.add(row)
          resizeObserver.observe(row)
        }
      })
      observed.forEach((row) => {
        if (!row.isConnected) {
          observed.delete(row)
          resizeObserver.unobserve(row)
        }
      })
    }
    sync()
    const mutationObserver = new MutationObserver(sync)
    mutationObserver.observe(container, { childList: true, subtree: true })

    return {
      recordHeights: () => {
        observed.forEach((row) => heights.set(row, heightOf(row)))
      },
      teardown: () => {
        mutationObserver.disconnect()
        resizeObserver.disconnect()
        observed.clear()
      },
    }
  }
}
