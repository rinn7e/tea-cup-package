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
// A watch of an element not in the document yet (`TeaObserver.watch`): a row
// of a virtualized list loaded but not drawn waits for its element, costing
// nothing meanwhile (it retried `getElementById` every 50 ms, a timer per row,
// set up again at every program update), and observes it once it is drawn.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as TeaObserver from '../src'

// jsdom has no IntersectionObserver: one that records what it observes
const observed: Element[] = []
const observers: {
  callback: IntersectionObserverCallback
  instance: IntersectionObserver
}[] = []

class FakeIntersectionObserver {
  readonly thresholds = [0]
  constructor(callback: IntersectionObserverCallback) {
    observers.push({
      callback,
      instance: this as unknown as IntersectionObserver,
    })
  }
  observe(el: Element) {
    observed.push(el)
  }
  unobserve(el: Element) {
    observed.splice(observed.indexOf(el), 1)
  }
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  observed.splice(0)
  observers.splice(0)
  document.body.innerHTML = ''
})

const watch = (id: string, sent: string[]) => {
  const sub = TeaObserver.watch(id, {}, (inView) =>
    inView ? `in:${id}` : `out:${id}`,
  )
  sub.init((msg) => sent.push(msg))
  return sub
}

// MutationObserver callbacks run as a microtask after the change
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('a watch of an element not in the document yet', () => {
  it('sets no timer while it waits, however many rows wait', () => {
    vi.useFakeTimers()
    const subs = Array.from({ length: 200 }, (_, i) => watch(`row${i}`, []))
    expect(vi.getTimerCount()).toBe(0)
    subs.forEach((sub) => sub.release())
  })

  it('observes the element once it is added, and reports it', async () => {
    const sent: string[] = []
    const sub = watch('row1', sent)
    expect(observed).toEqual([])
    const el = document.createElement('div')
    el.id = 'row1'
    document.body.appendChild(el)
    await settle()
    expect(observed).toEqual([el])
    const { callback, instance } = observers[0]
    callback(
      [
        {
          target: el,
          isIntersecting: true,
          intersectionRatio: 1,
        } as unknown as IntersectionObserverEntry,
      ],
      instance,
    )
    expect(sent).toEqual(['in:row1'])
    sub.release()
    expect(observed).toEqual([])
  })

  it('observes an element already there at once', () => {
    const el = document.createElement('div')
    el.id = 'row2'
    document.body.appendChild(el)
    const sub = watch('row2', [])
    expect(observed).toEqual([el])
    sub.release()
  })

  it('stops waiting when released', async () => {
    const sub = watch('row3', [])
    sub.release()
    const el = document.createElement('div')
    el.id = 'row3'
    document.body.appendChild(el)
    await settle()
    expect(observed).toEqual([])
  })
})
