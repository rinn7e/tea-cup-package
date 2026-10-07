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
import { followKeyboard, holdBodyLock, releaseDrawer } from '../src/effect'

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

// followKeyboard: the vitest environment is `node`, so the few DOM pieces it
// uses are faked here
// ---------------------------------

class FakeElement {
  style = { bottom: '', maxHeight: '' }
  isContentEditable = false
  private readonly descendants: FakeElement[]
  constructor(descendants: FakeElement[] = []) {
    this.descendants = descendants
  }
  contains(other: FakeElement): boolean {
    return (
      other === this || this.descendants.some((child) => child.contains(other))
    )
  }
}

class FakeInput extends FakeElement {
  type: string
  constructor(type: string = 'text') {
    super()
    this.type = type
  }
}

class FakeTextArea extends FakeElement {}

type Listener = () => void

const listeners = () => {
  const map = new Map<string, Set<Listener>>()
  return {
    map,
    addEventListener: (type: string, fn: Listener) => {
      map.set(type, (map.get(type) ?? new Set()).add(fn))
    },
    removeEventListener: (type: string, fn: Listener) => {
      map.get(type)?.delete(fn)
    },
    fire: (type: string) => map.get(type)?.forEach((fn) => fn()),
    count: () => Array.from(map.values()).reduce((n, fns) => n + fns.size, 0),
  }
}

describe('followKeyboard', () => {
  const windowHeight = 800
  let viewport: ReturnType<typeof listeners> & {
    height: number
    offsetTop: number
  }
  let doc: ReturnType<typeof listeners> & { activeElement: unknown }
  let field: FakeInput
  let content: FakeElement
  const outside = new FakeInput()

  beforeEach(() => {
    field = new FakeInput()
    content = new FakeElement([field])
    viewport = { ...listeners(), height: windowHeight, offsetTop: 0 }
    doc = {
      ...listeners(),
      activeElement: null,
      getElementById: (id: string) =>
        id === Drawer.contentDomId('test') ? content : null,
    } as typeof doc
    vi.stubGlobal('HTMLElement', FakeElement)
    vi.stubGlobal('HTMLInputElement', FakeInput)
    vi.stubGlobal('HTMLTextAreaElement', FakeTextArea)
    vi.stubGlobal('window', {
      visualViewport: viewport,
      innerHeight: windowHeight,
    })
    vi.stubGlobal('document', doc)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // The keyboard takes `height` px of the window
  const keyboard = (height: number) => {
    viewport.height = windowHeight - height
    viewport.fire('resize')
  }

  it('lifts the drawer above the keyboard for one of its fields', () => {
    followKeyboard(config())
    doc.activeElement = field
    keyboard(300)
    expect(content.style).toEqual({ bottom: '300px', maxHeight: '474px' })
  })

  it('puts it back once the keyboard closes, not when the field blurs', () => {
    followKeyboard(config())
    doc.activeElement = field
    keyboard(300)
    // A tap on one of the drawer's buttons: the field loses focus
    doc.activeElement = null
    keyboard(280)
    expect(content.style.bottom).toBe('280px')
    keyboard(0)
    expect(content.style).toEqual({ bottom: '', maxHeight: '' })
  })

  it('takes a viewport shrinking less than 60px for the browser toolbars', () => {
    followKeyboard(config())
    doc.activeElement = field
    keyboard(59)
    expect(content.style.bottom).toBe('')
    keyboard(60)
    expect(content.style.bottom).toBe('60px')
  })

  it('stays put for a field outside the drawer, or one that is no text field', () => {
    followKeyboard(config())
    doc.activeElement = outside
    keyboard(300)
    expect(content.style.bottom).toBe('')

    const checkbox = new FakeInput('checkbox')
    content = new FakeElement([checkbox])
    doc.activeElement = checkbox
    keyboard(310)
    expect(content.style.bottom).toBe('')
  })

  it('lifts it when one of its fields is focused with the keyboard open', () => {
    followKeyboard(config())
    doc.activeElement = outside
    keyboard(300)
    expect(content.style.bottom).toBe('')
    doc.activeElement = field
    doc.fire('focusin')
    expect(content.style.bottom).toBe('300px')
  })

  it('does not lift it on focus without a keyboard', () => {
    followKeyboard(config())
    doc.activeElement = field
    doc.fire('focusin')
    expect(content.style.bottom).toBe('')
  })

  it('stops listening and puts the drawer back on cleanup', () => {
    const cleanup = followKeyboard(config())
    doc.activeElement = field
    keyboard(300)
    expect(viewport.count() + doc.count()).toBe(2)
    cleanup()
    expect(viewport.count() + doc.count()).toBe(0)
    expect(content.style).toEqual({ bottom: '', maxHeight: '' })
  })

  it.each<[string, Partial<Drawer.Config<null>>]>([
    ['repositionInputs is off', { repositionInputs: false }],
    ['the drawer is not at the bottom', { direction: 'top' }],
  ])('does nothing when %s', (_name, over) => {
    const cleanup = followKeyboard(config(over))
    expect(viewport.count() + doc.count()).toBe(0)
    doc.activeElement = field
    keyboard(300)
    expect(content.style.bottom).toBe('')
    cleanup()
  })

  it('does nothing without a visual viewport', () => {
    vi.stubGlobal('window', { visualViewport: null, innerHeight: windowHeight })
    followKeyboard(config())
    expect(doc.count()).toBe(0)
  })
})

// The body scroll lock on iOS Safari (pinned with `position: fixed`): the
// same fakes as above, plus the body's style and fake timers for vaul's
// 300ms bottom-bar check
// ---------------------------------

describe('body scroll lock on iOS Safari', () => {
  let win: {
    innerHeight: number
    innerWidth: number
    scrollX: number
    scrollY: number
  }
  let style: Record<string, string>
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

  it('leaves the page alone once the lock is released', () => {
    holdBodyLock('view', config())
    // Closed before vaul's 300ms check runs
    releaseDrawer('view', config())
    win.innerHeight = 700
    vi.advanceTimersByTime(400)
    expect(style.top).toBe('')
  })
})
