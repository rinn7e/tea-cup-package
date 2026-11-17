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
import * as O from 'fp-ts/lib/Option'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as Drawer from '../src'
import { holdBodyLock, releaseDrawer } from '../src/effect'

const aria: Drawer.AriaConfig = {
  label: { _tag: 'Text', value: 'Test' },
  describedBy: O.none,
}

const config = (
  over: Partial<Drawer.Config<null>> = {},
): Drawer.Config<null> => ({
  ...Drawer.defaultConfig<null>('test', () => 'test', aria),
  ...over,
})

// The body scroll lock on iOS Safari (pinned with `position: fixed`): the
// vitest environment is `node`, so the window and the body are faked, with
// fake timers for vaul's 300ms bottom-bar check
// ---------------------------------

describe('body scroll lock on iOS Safari', () => {
  let win: {
    innerHeight: number
    innerWidth: number
    scrollX: number
    scrollY: number
  }
  let style: Record<string, string>
  // The body's attributes
  let attributes: Set<string>
  // Height of the scrolled document: taller than the window when the window
  // itself scrolls
  let pageHeight: number

  beforeEach(() => {
    pageHeight = 3000
    vi.useFakeTimers()
    // The body's own styles: none set
    style = {
      overflow: '',
      position: '',
      top: '',
      left: '',
      right: '',
      height: '',
      paddingRight: '',
    }
    attributes = new Set()
    win = { innerHeight: 800, innerWidth: 400, scrollX: 0, scrollY: 1000 }
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    })
    vi.stubGlobal('window', {
      get innerHeight() {
        return win.innerHeight
      },
      innerWidth: win.innerWidth,
      get scrollX() {
        return win.scrollX
      },
      get scrollY() {
        return win.scrollY
      },
      matchMedia: () => ({ matches: false }),
      setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
      requestAnimationFrame: (fn: () => void) => setTimeout(fn, 16),
      scrollTo: () => {},
    })
    vi.stubGlobal('document', {
      body: {
        style: Object.assign(style, {
          setProperty: (key: string, value: string) => {
            style[key] = value
          },
        }),
        setAttribute: (name: string) => attributes.add(name),
        removeAttribute: (name: string) => attributes.delete(name),
      },
      documentElement: { clientWidth: 400 },
      scrollingElement: {
        get scrollHeight() {
          return pageHeight
        },
      },
      activeElement: null,
      getElementById: () => null,
    })
    vi.stubGlobal('getComputedStyle', () => ({ paddingRight: '0px' }))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('moves the page up when the bottom bar appears while locked', () => {
    holdBodyLock('view', config())
    // The bottom bar takes 100px
    win.innerHeight = 700
    vi.advanceTimersByTime(400)
    expect(style.top).toBe('-1100px')
    releaseDrawer('view', config())
  })

  it('pins the body at the scroll, with the whole page height', () => {
    holdBodyLock('view', config())
    expect(style.position).toBe('fixed')
    expect(style.top).toBe('-1000px')
    expect(style.height).toBe('auto')
    releaseDrawer('view', config())
    expect(style).toMatchObject({ position: '', top: '', height: '' })
  })

  it("keeps the body's height when the page scrolls in its own containers", () => {
    // An app shell: the body is the window's height, its containers scroll
    pageHeight = 800
    win.scrollY = 0
    holdBodyLock('view', config())
    expect(style.position).toBe('fixed')
    expect(style.top).toBe('0px')
    // `auto` would grow the containers to their content and reset their
    // scroll
    expect(style.height).toBe('')
    releaseDrawer('view', config())
    expect(style).toMatchObject({ position: '', top: '', height: '' })
  })

  it("holds the lock with an attribute, not the body's inline overflow", () => {
    // A dialog's lock, released while the drawer opens, restores the inline
    // `overflow` it saved: the drawer's lock must not live there
    style.overflow = 'hidden'
    holdBodyLock('view', config())
    expect(attributes.has('data-drawer-scroll-lock')).toBe(true)
    style.overflow = ''
    expect(attributes.has('data-drawer-scroll-lock')).toBe(true)
    releaseDrawer('view', config())
    expect(attributes.has('data-drawer-scroll-lock')).toBe(false)
    expect(style.overflow).toBe('')
  })

  it('leaves the page alone once the lock is released', () => {
    holdBodyLock('view', config())
    // Closed before vaul's 300ms check runs
    releaseDrawer('view', config())
    win.innerHeight = 700
    vi.advanceTimersByTime(400)
    expect(style.top).toBe('')
  })
})
