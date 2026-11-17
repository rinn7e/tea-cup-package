// @vitest-environment jsdom
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
// A scroll to a row at a stored offset (a restore, or an open at the stored
// reading position) lands the row's top that far above the view's top, held
// inside the row as the engine learns its size: a row drawn shorter than the
// offset keeps the view inside it, and a row that grows later (late images)
// is aimed at again, down to the stored pixel. jsdom has no layout: the rows'
// heights are given here, the engine's writes are read from `scrollTo`, and
// a row's later growth is reported by a stand-in `ResizeObserver`.
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import * as SC from '../src'
import { ScrollContainer } from '../src/component'

// The height of each row, by its index (`data-index`)
const heights = new Map<string, number>()
// Where the engine scrolled the list to, in order
const writes: number[] = []
// The stand-in observers, to report a resize
const observers: FakeResizeObserver[] = []

class FakeResizeObserver {
  callback: ResizeObserverCallback
  observed = new Set<Element>()
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    observers.push(this)
  }
  observe(target: Element) {
    this.observed.add(target)
  }
  unobserve(target: Element) {
    this.observed.delete(target)
  }
  disconnect() {
    this.observed.clear()
  }
}

// Tells the observers of `target` that it is now `height` tall
const resize = (target: HTMLElement, height: number) => {
  observers
    .filter((observer) => observer.observed.has(target))
    .forEach((observer) =>
      observer.callback(
        [
          {
            target,
            borderBoxSize: [{ blockSize: height, inlineSize: 100 }],
          } as unknown as ResizeObserverEntry,
        ],
        observer as unknown as ResizeObserver,
      ),
    )
}

const saved: { restore: () => void }[] = []
beforeEach(() => {
  ;(
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true
  heights.clear()
  writes.length = 0
  observers.length = 0
  const offsetHeight = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetHeight',
  )
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get(this: HTMLElement) {
      return heights.get(this.dataset.index ?? '') ?? 0
    },
  })
  // The list's own scroll height, so the engine doesn't clamp its target to
  // a list of no height
  const scrollHeight = Object.getOwnPropertyDescriptor(
    Element.prototype,
    'scrollHeight',
  )
  Object.defineProperty(Element.prototype, 'scrollHeight', {
    configurable: true,
    get(this: Element) {
      return this.getAttribute('data-component') === 'ScrollContainer'
        ? 100_000
        : 0
    },
  })
  const scrollTo = Element.prototype.scrollTo
  Element.prototype.scrollTo = function (
    this: Element,
    options?: ScrollToOptions | number,
  ) {
    if (typeof options === 'object' && options.top !== undefined) {
      writes.push(options.top)
    }
  } as Element['scrollTo']
  const resizeObserver = window.ResizeObserver
  window.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver
  saved.push({
    restore: () => {
      if (offsetHeight) {
        Object.defineProperty(
          HTMLElement.prototype,
          'offsetHeight',
          offsetHeight,
        )
      }
      if (scrollHeight) {
        Object.defineProperty(Element.prototype, 'scrollHeight', scrollHeight)
      }
      Element.prototype.scrollTo = scrollTo
      window.ResizeObserver = resizeObserver
    },
  })
})

const mounted: (() => void)[] = []
afterEach(() => {
  mounted.splice(0).forEach((unmount) => unmount())
  saved.splice(0).forEach((s) => s.restore())
})

// Four rows of 200 px, the list restoring row `m2` (it starts at 400) with
// its top `offset` above the view's top
const restoreAt = (offset: number) => {
  ;['0', '1', '2', '3'].forEach((index) => heights.set(index, 200))
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  let model = SC.restoreHandler({ key: 'm2', offset }, false)(SC.init())
  const draw = () =>
    root.render(
      <ScrollContainer
        model={model}
        config={{ ...SC.chatConfig, virtualize: { _tag: 'Off' } }}
        count={4}
        getKey={(i) => `m${i}`}
        renderRow={(i) => <div>message {i}</div>}
        header={null}
        footer={null}
        containerRef={{ current: null }}
        className=''
        dispatch={() => undefined}
      />,
    )
  act(draw)
  mounted.push(() => {
    act(() => root.unmount())
    host.remove()
  })
  const row = () =>
    host.querySelector<HTMLElement>('[data-index="2"]') as HTMLElement
  // The owner's next decision for the list
  const decide = (next: (current: SC.Model) => SC.Model) => {
    model = next(model)
    act(draw)
  }
  return { row, decide }
}

describe('a scroll to a row at a stored offset', () => {
  it('lands the stored pixel when the row is as tall as then', () => {
    restoreAt(-150)
    expect(writes.at(-1)).toBe(400 + 150)
  })

  it('keeps the view inside a row drawn shorter than the stored offset', () => {
    // Stored 500 px into the row, which is 200 px tall now: its last pixel
    // lands at the top, not 300 px past it
    restoreAt(-500)
    expect(writes.at(-1)).toBe(400 + 199)
  })

  it('leaves a later scroll of ours alone when the row restored before grows', () => {
    // Restored at a row drawn short, then the reader goes to the newest
    // message: the restored row's images loading meanwhile don't pull the
    // view back to it
    const { row, decide } = restoreAt(-500)
    decide(SC.scrollToHandler({ _tag: 'End' }, 'instant', Date.now()))
    const toEnd = writes.at(-1)
    expect(toEnd).toBeGreaterThan(400 + 500)
    heights.set('2', 900)
    act(() => resize(row(), 900))
    expect(writes.at(-1)).toBe(toEnd)
  })

  it('leaves a row in view where it is when a scroll to it finds it there', () => {
    // Restored at a row drawn short, the reader scrolls, then a scroll to the
    // same row that leaves it where it is when in view (the open's, as the
    // API answers): its images loading don't pull the view to the restored
    // pixel. (jsdom has no layout: every row counts as in view.)
    const { row, decide } = restoreAt(-500)
    decide(SC.readerScrolledHandler)
    const before = writes.length
    decide(
      SC.scrollToHandler(
        { _tag: 'Key', key: 'm2', offset: 0, onlyIfHidden: true },
        'smooth',
        Date.now(),
      ),
    )
    heights.set('2', 900)
    act(() => resize(row(), 900))
    expect(writes.length).toBe(before)
  })

  it('aims again at the stored pixel when the row grows (late images)', () => {
    const { row } = restoreAt(-500)
    expect(writes.at(-1)).toBe(400 + 199)
    heights.set('2', 900)
    act(() => resize(row(), 900))
    expect(writes.at(-1)).toBe(400 + 500)
  })
})
