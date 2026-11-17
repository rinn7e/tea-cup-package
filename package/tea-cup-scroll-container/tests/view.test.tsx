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
// The scroll container's view: the settles nothing scrolls to report. jsdom
// has no layout, so every list here is at its end (no height): a scroll to
// the end moves nothing, as in a list already there.
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import * as SC from '../src'
import { type Props, ScrollContainer } from '../src/component'

beforeAll(() => {
  ;(
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true
})

const mounted: (() => void)[] = []
afterEach(() => {
  mounted.splice(0).forEach((unmount) => unmount())
})

// A chat that draws every row: jsdom has no layout, so a virtualized list
// would draw none (no view height), and the decisions here don't depend on it
const drawAll: SC.Config = { ...SC.chatConfig, virtualize: { _tag: 'Off' } }

// The view's props the tests below give, besides the model and the rows
type Extra = Pick<
  Props,
  'onAnchor' | 'overlay' | 'shownMargin' | 'watchEdges'
> &
  Partial<Pick<Props, 'config' | 'getKey'>>

// Renders the view with `model`, and returns the messages it sends
const render = (model: SC.Model, count: number = 3, extra: Extra = {}) => {
  let current = model
  let rows = count
  const sent: SC.Msg[] = []
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  const draw = () =>
    root.render(
      <ScrollContainer
        model={current}
        config={drawAll}
        count={rows}
        getKey={(i) => `m${i}`}
        renderRow={(i) => <div>message {i}</div>}
        header={null}
        footer={null}
        containerRef={{ current: null }}
        className=''
        dispatch={(msg) => sent.push(msg)}
        {...extra}
      />,
    )
  act(draw)
  mounted.push(() => {
    act(() => root.unmount())
    host.remove()
  })
  // The owner's model changes: the view draws with it
  const rerender = (next: SC.Model, count: number = rows) => {
    current = next
    rows = count
    act(draw)
  }
  return { sent, host, rerender }
}

const tags = (sent: SC.Msg[]) => sent.map((msg) => msg._tag)

describe('the scroll container view', () => {
  it('settles a scroll to where the list already is at once', () => {
    // iOS: opening the editor at the end scrolls to the end, which moves
    // nothing and fires no scroll event. Unsettled, the list stayed
    // `Navigating`, and the keyboard resize right after was ignored
    const navigating = SC.scrollToHandler(
      { _tag: 'End' },
      'smooth',
      Date.now(),
    )(SC.init({ _tag: 'Free', anchor: null }))
    const { sent } = render(navigating)
    const settled = sent.find((msg) => msg._tag === 'ScrollSettled')
    expect(settled).toMatchObject({ _tag: 'ScrollSettled', atEnd: true })
  })

  it('settles reader input that moved nothing (a wheel at the end)', async () => {
    vi.useFakeTimers()
    try {
      const { sent, host } = render(SC.init({ _tag: 'AtEnd' }))
      const list = host.querySelector('[data-component=ScrollContainer]')!
      const before = sent.length
      act(() => {
        list.dispatchEvent(new WheelEvent('wheel', { bubbles: true }))
      })
      expect(tags(sent.slice(before))).toEqual(['ReaderScrolled'])
      // No scroll event comes: the settle does, and says it is at the end
      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(sent.at(-1)).toMatchObject({ _tag: 'ScrollSettled', atEnd: true })
    } finally {
      vi.useRealTimers()
    }
  })

  it('lets a held jump go once its time is over, though nothing scrolls', () => {
    vi.useFakeTimers()
    try {
      const now = Date.now()
      const held = SC.scrollToHandler(
        { _tag: 'Key', key: 'm1', offset: 0, onlyIfHidden: false },
        'instant',
        now,
      )(SC.init({ _tag: 'Free', anchor: null }))
      const { sent } = render(held)
      const before = sent.length
      act(() => {
        vi.advanceTimersByTime(SC.MAX_NAVIGATE_MS + 200)
      })
      const late = sent.slice(before)
      expect(late.at(-1)).toMatchObject({ _tag: 'ScrollSettled' })
      // Past `until`, the settle ends the navigation
      const [after] = SC.update(SC.chatConfig)(late.at(-1)!, held)
      expect(after.follow._tag).not.toBe('Navigating')
    } finally {
      vi.useRealTimers()
    }
  })

  it('lets a held jump go once its time is over, after it aimed again', () => {
    // Rows land above the row: the scroll goes again (its `apply` clears the
    // reader's settle), and its `until` still ends it
    vi.useFakeTimers()
    try {
      const held = SC.scrollToHandler(
        { _tag: 'Key', key: 'm1', offset: 0, onlyIfHidden: false },
        'instant',
        Date.now(),
      )(SC.init({ _tag: 'Free', anchor: null }))
      let above = 0
      const { sent, rerender } = render(held, 3, {
        getKey: (i) => `m${i - above}`,
      })
      above = 2
      rerender(held, 5)
      expect(tags(sent)).toContain('ItemsChanged')
      const before = sent.length
      act(() => {
        vi.advanceTimersByTime(SC.MAX_NAVIGATE_MS + 200)
      })
      expect(sent.slice(before).at(-1)).toMatchObject({
        _tag: 'ScrollSettled',
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('settles a move the list cannot make at once (a viewport that grew at its top)', () => {
    // No scroll event comes for it: without the settle, the reader's last
    // gesture would never end (pages held for it stay held)
    const free = {
      ...SC.init({ _tag: 'Free', anchor: null }),
      geometry: { scrollTop: 0, scrollHeight: 0, clientHeight: 0 },
    }
    const [grown] = SC.update(SC.chatConfig)(
      { _tag: 'ViewportResized', prev: 600, next: 800 },
      free,
    )
    expect(grown.pendingAdjust?.command).toEqual({
      _tag: 'ScrollBy',
      delta: -200,
    })
    // The decision comes to a view already shown
    const { sent, rerender } = render(free)
    const before = sent.length
    rerender(grown)
    expect(sent.slice(before).at(-1)).toMatchObject({
      _tag: 'ScrollSettled',
    })
  })

  it('applies a list loaded again under the same view, numbered from 1 again', () => {
    // A list opened again from its own link loads its list again:
    // the new model's first decision has a number the view applied before
    const free = SC.init({ _tag: 'Free', anchor: null })
    const first = SC.scrollToHandler({ _tag: 'Start' }, 'instant', 0)(free)
    const second = SC.scrollToHandler({ _tag: 'Start' }, 'instant', 0)(first)
    const { sent, rerender } = render(second)
    const before = sent.length
    // Loaded again: a fresh model, its scroll to the end numbered 1
    rerender(SC.scrollToHandler({ _tag: 'End' }, 'smooth', Date.now())(free))
    expect(sent.slice(before)).toContainEqual(
      expect.objectContaining({ _tag: 'ScrollSettled', atEnd: true }),
    )
  })

  it('applies an owner decision that took the number of one of its own', () => {
    // The view decided number 1 itself (a resize); the owner's model, ahead
    // of the view, decided its own number 1 (a scroll to the end)
    const free = SC.init({ _tag: 'Free', anchor: null })
    const { sent, rerender } = render(free)
    const local = SC.viewportResizedHandler(SC.chatConfig, 800, 500)(free)
    expect(local.pendingAdjust?.seq).toBe(1)
    rerender(local)
    const before = sent.length
    const owner = SC.scrollToHandler(
      { _tag: 'End' },
      'smooth',
      Date.now(),
    )(free)
    expect(owner.pendingAdjust?.seq).toBe(1)
    rerender(owner)
    expect(sent.slice(before)).toContainEqual(
      expect.objectContaining({ _tag: 'ScrollSettled', atEnd: true }),
    )
  })

  it('tells the owner once per gesture that the reader moved a free list', () => {
    // The owner may still hold a provisional scroll (the open's, from the
    // cached rows) that the reader's input must end
    const { sent, host } = render(SC.init({ _tag: 'Free', anchor: null }))
    const list = host.querySelector('[data-component=ScrollContainer]')!
    const before = sent.length
    act(() => {
      list.dispatchEvent(new WheelEvent('wheel', { bubbles: true }))
      list.dispatchEvent(new WheelEvent('wheel', { bubbles: true }))
    })
    expect(tags(sent.slice(before))).toEqual(['ReaderScrolled'])
  })

  it('applies a list loaded again with the same first decision as before', () => {
    // The page opened at the end (decision 1: to the end, instant); the
    // reader scrolled; its own link loads the list again, and its
    // open decides the same first thing: it is a new decision all the same
    const opened = SC.scrollToHandler(
      { _tag: 'End' },
      'instant',
      0,
    )(SC.init({ _tag: 'Free', anchor: null }))
    const { sent, rerender } = render(opened)
    rerender({ ...opened, follow: { _tag: 'Free', anchor: null } })
    const before = sent.length
    const again = SC.scrollToHandler(
      { _tag: 'End' },
      'instant',
      0,
    )(SC.init({ _tag: 'Free', anchor: null }))
    expect(again.pendingAdjust).toEqual(opened.pendingAdjust)
    rerender(again)
    expect(sent.slice(before)).toContainEqual(
      expect.objectContaining({ _tag: 'ScrollSettled', atEnd: true }),
    )
  })

  it('lets the reader take over with a navigation key, not with typing', () => {
    const navigating = SC.scrollToHandler(
      { _tag: 'Key', key: 'm1', offset: 0, onlyIfHidden: false },
      'instant',
      Date.now(),
    )(SC.init({ _tag: 'Free', anchor: null }))
    const { sent } = render(navigating)
    const field = document.createElement('textarea')
    document.body.appendChild(field)
    const before = sent.length
    act(() => {
      field.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true }),
      )
    })
    expect(tags(sent.slice(before))).toEqual([])
    act(() => {
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true }),
      )
    })
    expect(tags(sent.slice(before))).toEqual(['ReaderScrolled'])
    field.remove()
  })

  it('takes a press on the scrollbar for the reader, not one on a row', () => {
    const { sent, host } = render(SC.init({ _tag: 'AtEnd' }))
    const list = host.querySelector('[data-component=ScrollContainer]')!
    const row = list.querySelector('[data-index]')!
    const before = sent.length
    act(() => {
      row.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    })
    expect(tags(sent.slice(before))).toEqual([])
    act(() => {
      list.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    })
    expect(tags(sent.slice(before))).toEqual(['ReaderScrolled'])
  })

  // The owner drew the list again on a model that settled before (another
  // layout, a parent that changed): the fresh view starts at the top, so it
  // puts the settled position back, hidden until it is there
  const settledAt = (follow: SC.Follow): SC.Model => ({
    ...SC.init(follow),
    geometry: { scrollTop: 900, scrollHeight: 2000, clientHeight: 500 },
  })

  it('puts a list that was at its end back at its end when drawn again', () => {
    const { sent } = render(settledAt({ _tag: 'AtEnd' }))
    expect(sent).toContainEqual(
      expect.objectContaining({
        _tag: 'ScrollTo',
        target: { _tag: 'End' },
        behavior: 'instant',
        hide: true,
      }),
    )
  })

  it('puts the row read back when a free list is drawn again', () => {
    const anchor = { key: 'm1', offset: -40 }
    const { sent } = render(settledAt({ _tag: 'Free', anchor }))
    expect(sent).toContainEqual({ _tag: 'Restore', anchor, hide: true })
  })

  it('puts a list back though its last hiding decision is still placing it', () => {
    const { sent } = render({ ...settledAt({ _tag: 'AtEnd' }), placing: 1 })
    expect(sent).toContainEqual(
      expect.objectContaining({
        _tag: 'ScrollTo',
        target: { _tag: 'End' },
        hide: true,
      }),
    )
  })

  it('puts no end back for a list that keeps its top line (a feed)', () => {
    // A feed stays `AtEnd` with a page loaded below since: its end moved
    const { sent } = render(settledAt({ _tag: 'AtEnd' }), 3, {
      config: { ...drawAll, onViewportResize: 'keepStart' },
    })
    expect(tags(sent)).not.toContain('ScrollTo')
  })

  it('puts nothing back for a list that never settled', () => {
    const { sent } = render(SC.init({ _tag: 'AtEnd' }))
    expect(tags(sent)).not.toContain('ScrollTo')
    expect(tags(sent)).not.toContain('Restore')
  })

  it('draws every row when not virtualized, from the first render', () => {
    const { host } = render(SC.init())
    expect(host.querySelectorAll('[data-index]').length).toBe(3)
  })

  it('keeps the margins of a row inside the row it measures', () => {
    // A list whose rows start with a top margin: escaping the measured
    // row, it pushed the row down without counting in its height. jsdom has
    // no layout to measure that (a browser does): the row is a
    // block formatting context, which keeps its content's margins in
    const { host } = render(SC.init())
    const rows = Array.from(host.querySelectorAll('[data-index]'))
    expect(rows).toHaveLength(3)
    rows.forEach((row) => expect(row.classList).toContain('flow-root'))
  })

  it("applies a decision of its own once, not again from the owner's echo", () => {
    // Rows land above a row a scroll of ours goes to: the view decides to aim
    // at it again (`step`), and the program, running the same messages on its
    // model, makes the same decisions again. The view must not scroll a
    // second time
    const navigating = SC.scrollToHandler(
      { _tag: 'Key', key: 'm1', offset: 0, onlyIfHidden: false },
      'smooth',
      Date.now(),
      false,
    )(SC.init({ _tag: 'Free', anchor: null }))
    // Keys from `m0` up, then two rows land above `m0`
    let above = 0
    const { sent, rerender } = render(navigating, 3, {
      getKey: (i) => `m${i - above}`,
    })
    above = 2
    rerender(navigating, 5)
    expect(tags(sent)).toContain('ItemsChanged')
    // The owner's model: every message the view sent, run by the program
    const owner = sent.reduce(
      (model, msg) => SC.update(SC.chatConfig)(msg, model)[0],
      navigating,
    )
    expect(owner.pendingAdjust?.command).toMatchObject({
      _tag: 'ScrollToKey',
      key: 'm1',
    })
    const before = sent.length
    rerender(owner, 5)
    expect(tags(sent.slice(before))).toEqual([])
  })

  it('stays hidden until a frame painted the decision that hid it', () => {
    vi.useFakeTimers()
    try {
      const hidden = SC.scrollToHandler(
        { _tag: 'End' },
        'instant',
        Date.now(),
        true,
      )(SC.init({ _tag: 'Free', anchor: null }))
      const anchors: SC.Anchor[] = []
      const { sent, host } = render(hidden, 3, {
        onAnchor: (anchor) => anchors.push(anchor),
      })
      const list = host.querySelector('[data-component=ScrollContainer]')!
      expect(list.className).toContain('opacity-0')
      expect(tags(sent)).not.toContain('Placed')
      act(() => {
        vi.advanceTimersByTime(100)
      })
      expect(sent).toContainEqual({ _tag: 'Placed', seq: hidden.placing })
      expect(list.className).toContain('opacity-100')
      // Where it landed is reported once, now that the list is shown
      expect(anchors).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows a list drawn again while placed, its hiding decision already applied', () => {
    // A list shown again before its `Placed` (the page switched away
    // and back): the scroll that hid it is applied and has settled, so the
    // view applies no decision, and nothing else would end the wait. (A feed:
    // a chat at its end would put its end back with a decision of its own.)
    vi.useFakeTimers()
    try {
      const hidden = SC.scrollToHandler(
        { _tag: 'End' },
        'instant',
        Date.now(),
        true,
      )(SC.init({ _tag: 'Free', anchor: null }))
      const [settled] = SC.update(SC.chatConfig)(
        {
          _tag: 'ScrollSettled',
          geometry: { scrollTop: 0, scrollHeight: 0, clientHeight: 0 },
          anchor: null,
          atEnd: true,
          now: Date.now(),
        },
        hidden,
      )
      expect(settled.follow._tag).toBe('AtEnd')
      expect(settled.placing).toBe(hidden.placing)
      const { sent, host } = render(settled, 3, {
        config: { ...drawAll, onViewportResize: 'keepStart' },
      })
      const list = host.querySelector('[data-component=ScrollContainer]')!
      expect(list.className).toContain('opacity-0')
      act(() => {
        vi.advanceTimersByTime(100)
      })
      expect(sent).toContainEqual({ _tag: 'Placed', seq: hidden.placing })
      expect(list.className).toContain('opacity-100')
    } finally {
      vi.useRealTimers()
    }
  })

  it('reports no anchor and no edge while the list is placed', () => {
    vi.useFakeTimers()
    try {
      const hidden = SC.scrollToHandler(
        { _tag: 'End' },
        'instant',
        Date.now(),
        true,
      )(SC.init({ _tag: 'Free', anchor: null }))
      const anchors: SC.Anchor[] = []
      const { sent, host } = render(hidden, 3, {
        onAnchor: (anchor) => anchors.push(anchor),
        watchEdges: { start: true, end: true },
      })
      const list = host.querySelector('[data-component=ScrollContainer]')!
      act(() => {
        list.dispatchEvent(new Event('scroll'))
      })
      expect(anchors).toEqual([])
      expect(tags(sent)).not.toContain('EdgeShown')
      // Placed: jsdom has no layout, so both edges are in the view
      act(() => {
        vi.advanceTimersByTime(100)
      })
      expect(sent.filter((msg) => msg._tag === 'EdgeShown')).toEqual([
        { _tag: 'EdgeShown', edge: 'Start' },
        { _tag: 'EdgeShown', edge: 'End' },
      ])
    } finally {
      vi.useRealTimers()
    }
  })

  it('reports the anchor on a scroll of the list shown', () => {
    const anchors: SC.Anchor[] = []
    const { host } = render(SC.init({ _tag: 'AtEnd' }), 3, {
      onAnchor: (anchor) => anchors.push(anchor),
    })
    const list = host.querySelector('[data-component=ScrollContainer]')!
    act(() => {
      list.dispatchEvent(new Event('scroll'))
    })
    expect(anchors).toHaveLength(1)
    expect(anchors[0]).toMatchObject({ offset: 0 })
  })

  it('reports a watched edge once in view, and again when the rows change', () => {
    const { sent, rerender } = render(SC.init({ _tag: 'AtEnd' }), 3, {
      watchEdges: { start: true, end: false },
    })
    const edgesShown = () => sent.filter((msg) => msg._tag === 'EdgeShown')
    expect(edgesShown()).toEqual([{ _tag: 'EdgeShown', edge: 'Start' }])
    // Drawn again with the same rows: nothing new to report
    rerender(SC.init({ _tag: 'AtEnd' }), 3)
    expect(edgesShown()).toHaveLength(1)
    // A page landed and the header is still in view: it loads the next one
    rerender(SC.init({ _tag: 'AtEnd' }), 5)
    expect(edgesShown()).toHaveLength(2)
  })

  it('gives the overlay what the view shows', () => {
    const seen: SC.OverlayView[] = []
    render(SC.init({ _tag: 'AtEnd' }), 3, {
      overlay: (view) => {
        seen.push(view)
        return <div data-test='overlay' />
      },
    })
    expect(seen.at(-1)).toMatchObject({ isScrolling: false })
    expect(document.querySelector('[data-test=overlay]')).not.toBeNull()
  })

  it('gives the overlay no view while the list is placed, then where it landed', () => {
    // Opened at the newest message: the engine takes the offset of the
    // instant scroll only from the scroll event after it, so a view while
    // placing said the end was not shown (the "go to latest" button faded
    // in, then out)
    vi.useFakeTimers()
    try {
      const hidden = SC.scrollToHandler(
        { _tag: 'End' },
        'instant',
        Date.now(),
        true,
      )(SC.init({ _tag: 'Free', anchor: null }))
      const seen: SC.OverlayView[] = []
      const { sent } = render(hidden, 3, {
        shownMargin: 84,
        overlay: (view) => {
          seen.push(view)
          return <div data-test='overlay' />
        },
      })
      expect(seen).toEqual([])
      expect(document.querySelector('[data-test=overlay]')).toBeNull()
      act(() => {
        vi.advanceTimersByTime(100)
      })
      expect(tags(sent)).toContain('Placed')
      expect(seen.length).toBeGreaterThan(0)
      expect(document.querySelector('[data-test=overlay]')).not.toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('gives the overlay no view before the list is drawn', () => {
    // The engine has no scroll element before the first commit: what the
    // view shows isn't known yet
    const drawn: boolean[] = []
    render(SC.init({ _tag: 'AtEnd' }), 3, {
      overlay: () => {
        drawn.push(
          document.querySelector('[data-component=ScrollContainer]') !== null,
        )
        return null
      },
    })
    expect(drawn.length).toBeGreaterThan(0)
    expect(drawn.every((isDrawn) => isDrawn)).toBe(true)
  })
})
