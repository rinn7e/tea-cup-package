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
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as Drawer from '../src'
import { contentAttrs, defaultHandleView, drawerHandleView } from '../src/view'

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

describe('defaultConfig — ui', () => {
  it('leaves the views to the package when unset', () => {
    expect(Drawer.defaultConfig<null>('test', () => 'test', aria).ui).toBe(
      undefined,
    )
  })

  it('keeps the given views', () => {
    const ui: Drawer.Ui = { handle: () => createElement('i') }
    expect(Drawer.defaultConfig<null>('test', () => 'test', aria, ui).ui).toBe(
      ui,
    )
  })
})

describe('drawerHandleView', () => {
  it('renders the package handle when the config has none', () => {
    const dispatched: Drawer.Msg<null>[] = []
    const handle = drawerHandleView(config(), (m) => dispatched.push(m), 'mine')
    const expected = defaultHandleView({
      attrs: {
        'data-drawer-handle': 'bottom',
        'aria-hidden': 'true',
        onClick: () => {},
      },
      className: 'mine',
      children: null,
    })
    expect(handle.type).toBe(expected.type)
    expect(handle.props.className).toBe(expected.props.className)
    // Its own drawer's direction
    expect(handle.props['data-drawer-handle']).toBe('bottom')
  })

  it('renders the config’s handle with the attributes, class and hit area', () => {
    const args: Drawer.HandleUiArg[] = []
    const custom = createElement('i')
    const dispatched: Drawer.Msg<null>[] = []
    const handle = drawerHandleView(
      config({
        ui: {
          handle: (arg) => {
            args.push(arg)
            return custom
          },
        },
      }),
      (m) => dispatched.push(m),
      'mine',
    )
    expect(handle).toBe(custom)
    expect(args).toHaveLength(1)
    const [arg] = args
    expect(arg.className).toBe('mine')
    expect(arg.attrs['data-drawer-handle']).toBe('bottom')
    expect(arg.attrs['aria-hidden']).toBe('true')
    expect(
      (arg.children as { props: Record<string, unknown> }).props,
    ).toHaveProperty('data-drawer-handle-hitarea', '')
    // A tap moves to the next snap point
    arg.attrs.onClick()
    expect(dispatched).toEqual([{ _tag: 'CycleSnap' }])
  })
})

describe('Open — skipAnimation', () => {
  const run = (
    model: Drawer.Model<null>,
    ...msgs: Drawer.Msg<null>[]
  ): Drawer.Model<null> =>
    msgs.reduce((m, msg) => Drawer.update(msg, m)[0], model)
  const closed = (over: Partial<Drawer.Config<null>> = {}) =>
    Drawer.defaultModel(config(over))
  const open: Drawer.Msg<null> = { _tag: 'Open', internal: null }
  const openAtRest: Drawer.Msg<null> = {
    _tag: 'Open',
    internal: null,
    skipAnimation: true,
  }

  it('slides in by default', () => {
    expect(run(closed(), open).animate._tag).toBe('Mounting')
  })

  it('is shown at rest at once when skipping the animation', () => {
    const model = closed({
      snap: {
        _tag: 'Snap',
        initial: {
          before: [],
          active: { _tag: 'Fraction', value: 0.5 },
          after: [{ _tag: 'Fraction', value: 1 }],
        },
        fadeFrom: O.none,
        sequential: false,
      },
    })
    const shown = run({ ...model, snap: { _tag: 'NoSnap' } }, openAtRest)
    expect(shown.animate).toEqual({
      _tag: 'Visible',
      internal: null,
      gesture: { _tag: 'Idle' },
    })
    // The snap point comes from the config, as after sliding in
    expect(shown.snap).toEqual(model.snap)
    expect(shown.seq).toBe(model.seq + 1)
  })

  it('moves the focus in once painted, unless it has moved since', () => {
    const shown = run(closed(), openAtRest)
    const [same, cmd] = Drawer.update(
      { _tag: 'FocusFrame', seq: shown.seq },
      shown,
    )
    expect(same).toEqual(shown)
    expect(cmd).not.toEqual(Drawer.update({ _tag: 'NoOp' }, shown)[1])
    const closing = run(shown, { _tag: 'Close' })
    expect(
      Drawer.update({ _tag: 'FocusFrame', seq: shown.seq }, closing),
    ).toEqual(Drawer.update({ _tag: 'NoOp' }, closing))
  })

  it('closes with an animation as usual', () => {
    const closing = run(closed(), openAtRest, { _tag: 'Close' })
    expect(closing.animate._tag).toBe('AnimateOut')
    expect(run(closing, { _tag: 'TransitionEnd' }).animate._tag).toBe(
      'Invisible',
    )
  })

  it('moves as usual when on screen', () => {
    const mounting = run(closed(), open)
    const closing = run(
      mounting,
      { _tag: 'MountFrame', seq: mounting.seq },
      { _tag: 'TransitionEnd' },
      { _tag: 'Close' },
    )
    expect(closing.animate._tag).toBe('AnimateOut')
    // Reopened while sliding out: reverses
    expect(run(closing, openAtRest).animate._tag).toBe('AnimateIn')
    // Open: only the payload changes
    const shown = run(closed(), openAtRest)
    expect(run(shown, openAtRest).animate).toEqual(shown.animate)
  })
})

describe('decideDrag — a scroller in a drawer on a snap point', () => {
  // A press inside the compact editor's text: the drawer rests 300px down
  const press = (scrollerTakesOpening: boolean): Drawer.Press => ({
    pointerType: 'touch',
    startX: 100,
    startY: 700,
    startedAt: 0,
    startDistance: 300,
    size: 800,
    viewport: 800,
    isNoDragTarget: false,
    scrollerTakesGesture: false,
    scrollerTakesOpening,
    isInCrossScroller: false,
    isContentScrolling: false,
  })
  const decide = (
    p: Drawer.Press,
    isDraggingInDirection: boolean,
    snapIndex = 0,
  ) =>
    Drawer.decideDrag(config({ dismissible: false }), p, {
      isDraggingInDirection,
      snapIndex,
      hasSelection: false,
      time: 1000,
      lastDragPreventedAt: O.none,
      openedAt: O.none,
    }).allow

  it('scrolls a text that is not at its end on a pull up', () => {
    expect(decide(press(true), true)).toBe(false)
  })

  it('opens the drawer once the text is at its end', () => {
    expect(decide(press(false), true)).toBe(true)
  })

  it('leaves a push down from the first snap point to the content', () => {
    expect(decide(press(true), false)).toBe(false)
    expect(decide(press(false), false)).toBe(false)
  })

  it('drags the drawer on a push down from a later snap point', () => {
    expect(decide(press(true), false, 1)).toBe(true)
  })
})

describe('touchMoveDecision — the touch path of a press', () => {
  // The compact editor: a bottom sheet resting on its first snap point, its
  // text not scrollable
  const model: Drawer.Model<null> = {
    ...Drawer.defaultModel(
      config({
        dismissible: false,
        snap: {
          _tag: 'Snap',
          initial: {
            before: [],
            active: { _tag: 'Fraction', value: 0.5 },
            after: [{ _tag: 'Fraction', value: 1 }],
          },
          fadeFrom: O.none,
          sequential: false,
        },
      }),
    ),
    animate: { _tag: 'Visible', internal: null, gesture: { _tag: 'Idle' } },
  }
  const press: Drawer.Press = {
    pointerType: 'touch',
    startX: 100,
    startY: 700,
    startedAt: 0,
    startDistance: 400,
    size: 800,
    viewport: 800,
    isNoDragTarget: false,
    scrollerTakesGesture: false,
    scrollerTakesOpening: false,
    isInCrossScroller: false,
    isContentScrolling: false,
  }
  const allows = (dx: number, dy: number) =>
    O.map((d: Drawer.DragDecision) => d.allow)(
      Drawer.touchMoveDecision(
        model,
        press,
        { x: press.startX + dx, y: press.startY + dy, time: 1000 },
        false,
      ),
    )

  it('is taken by `update`', () => {
    expect(Drawer.takesPress(model)).toBe(true)
    expect(Drawer.takesPress(Drawer.lockDrag(model))).toBe(false)
  })

  it('cancels the first move up, before `dragThreshold`', () => {
    expect(allows(0, -1)).toEqual(O.some(true))
  })

  it('cancels a move up past `dragThreshold`', () => {
    expect(allows(2, -40)).toEqual(O.some(true))
  })

  it('leaves a move across the axis to the content', () => {
    expect(allows(-1, 0)).toEqual(O.some(false))
    expect(allows(-40, 2)).toEqual(O.none)
  })

  it('leaves a push down from the first snap point to the content', () => {
    expect(allows(0, 40)).toEqual(O.some(false))
  })

  it('leaves the first move in a scroller across the axis to it', () => {
    const inRow = { ...press, isInCrossScroller: true }
    const decide = (dy: number) =>
      Drawer.touchMoveDecision(
        model,
        inRow,
        { x: press.startX, y: press.startY + dy, time: 1000 },
        false,
      )
    expect(O.map((d: Drawer.DragDecision) => d.allow)(decide(-1))).toEqual(
      O.some(false),
    )
    // Past `dragThreshold` it drags as anywhere else
    expect(O.map((d: Drawer.DragDecision) => d.allow)(decide(-40))).toEqual(
      O.some(true),
    )
  })

  it('agrees with `decideMove` along the axis', () => {
    const move = { x: press.startX, y: press.startY - 40, time: 1000 }
    expect(Drawer.touchMoveDecision(model, press, move, false)).toEqual(
      O.some(Drawer.decideMove(model, press, move, false)),
    )
  })

  describe('on the content element', () => {
    // Just what `contentAttrs` reads off the content (a single element: the
    // press lands on it, outside any scroller)
    class FakeContent {
      readonly dataset: Record<string, string> = { state: 'Visible' }
      readonly tagName = 'DIV'
      readonly parentElement = null
      readonly scrollTop = 0
      readonly scrollHeight = 800
      readonly scrollWidth = 300
      readonly clientHeight = 800
      readonly clientWidth = 300
      readonly onTouchMove: ((e: unknown) => void)[] = []
      addEventListener(type: string, fn: (e: unknown) => void) {
        if (type === 'touchmove') this.onTouchMove.push(fn)
      }
      removeEventListener() {}
      contains(other: unknown) {
        return other === this
      }
      closest() {
        return null
      }
      getBoundingClientRect() {
        return { height: 800, width: 300 }
      }
    }

    let content: FakeContent

    beforeEach(() => {
      content = new FakeContent()
      vi.stubGlobal('Element', FakeContent)
      vi.stubGlobal('window', {
        innerHeight: 800,
        getComputedStyle: () => ({
          overflowX: 'visible',
          overflowY: 'visible',
        }),
        getSelection: () => null,
      })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    const pointerDown = (attrs: Drawer.ContentAttrs) =>
      attrs.onPointerDown({
        currentTarget: content,
        target: content,
        button: 0,
        isPrimary: true,
        pointerType: 'touch',
        pageX: press.startX,
        pageY: press.startY,
        timeStamp: 0,
      } as never)

    // Whether a touch move by (`dx`, `dy`) from the press is cancelled
    const isCancelled = (dx: number, dy: number): boolean => {
      const touch = { pageX: press.startX + dx, pageY: press.startY + dy }
      let cancelled = false
      content.onTouchMove.forEach((fn) =>
        fn({
          touches: { item: () => touch },
          timeStamp: 1000,
          cancelable: true,
          preventDefault: () => {
            cancelled = true
          },
        }),
      )
      return cancelled
    }

    it('cancels the moves of a press `update` drags', () => {
      const attrs = contentAttrs(model, vi.fn())
      attrs.ref(content as never)
      pointerDown(attrs)
      expect(isCancelled(0, -1)).toBe(true)
      expect(isCancelled(0, -40)).toBe(true)
    })

    it('leaves the rest of the press to the content once it goes across', () => {
      const attrs = contentAttrs(model, vi.fn())
      attrs.ref(content as never)
      pointerDown(attrs)
      expect(isCancelled(-40, 2)).toBe(false)
      // Back along the axis: still the content's, as in `update`
      expect(isCancelled(0, -40)).toBe(false)
    })

    it('leaves a press `update` ignores to the content', () => {
      const attrs = contentAttrs(Drawer.lockDrag(model), vi.fn())
      attrs.ref(content as never)
      pointerDown(attrs)
      expect(isCancelled(0, -40)).toBe(false)
    })
  })
})

describe('scrollerTakesOpening', () => {
  const box = (scrollTop: number): Drawer.ScrollBox => ({
    scrollTop,
    scrollHeight: 1000,
    scrollWidth: 300,
    clientHeight: 200,
    clientWidth: 300,
    overflowX: 'hidden',
    overflowY: 'auto',
  })

  it('takes a pull up while a bottom drawer’s scroller can scroll down', () => {
    expect(Drawer.scrollerTakesOpening('bottom', box(0))).toBe(true)
    expect(Drawer.scrollerTakesOpening('bottom', box(400))).toBe(true)
    expect(Drawer.scrollerTakesOpening('bottom', box(800))).toBe(false)
  })

  it('mirrors for a top drawer, and never takes a side drawer’s', () => {
    expect(Drawer.scrollerTakesOpening('top', box(0))).toBe(false)
    expect(Drawer.scrollerTakesOpening('top', box(400))).toBe(true)
    expect(Drawer.scrollerTakesOpening('right', box(400))).toBe(false)
  })
})

describe('scrollsAcross', () => {
  const row: Drawer.ScrollBox = {
    scrollTop: 0,
    scrollHeight: 50,
    scrollWidth: 900,
    clientHeight: 50,
    clientWidth: 300,
    overflowX: 'auto',
    overflowY: 'hidden',
  }

  it('finds a sideways row in a bottom drawer, not in a side one', () => {
    expect(Drawer.scrollsAcross('bottom', row)).toBe(true)
    expect(Drawer.scrollsAcross('right', row)).toBe(false)
  })

  it('ignores a row that fits', () => {
    expect(Drawer.scrollsAcross('bottom', { ...row, scrollWidth: 300 })).toBe(
      false,
    )
  })
})
