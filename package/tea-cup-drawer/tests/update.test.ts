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
import * as S from 'fp-ts/lib/string'
import { describe, expect, it, vi } from 'vitest'

import {
  type AriaConfig,
  type Config,
  type Model,
  type Msg,
  type Press,
  type Props,
  activeSnapIndex,
  defaultConfig,
  defaultModel,
  getContent,
  getInternal,
  getPropsEq,
  isOpen,
  modifyContent,
  update,
} from '../src'

const aria: AriaConfig = {
  label: { _tag: 'Text', value: 'Test drawer' },
  describedBy: O.none,
}

type M = Model<string>

// The press state of a drawer at rest; `None` for states that can't hold one
const gestureTag = (model: M): 'Idle' | 'Pressed' | 'None' => {
  const animate = model.animate
  switch (animate._tag) {
    case 'Visible':
    case 'Settling':
      return animate.gesture._tag
    case 'Invisible':
    case 'Mounting':
    case 'AnimateIn':
    case 'Dragging':
    case 'AnimateOut':
      return 'None'
  }
}

const run = (model: M, ...msgs: Msg<string>[]): M =>
  msgs.reduce((m, msg) => update(msg, m)[0], model)

const press = (overrides: Partial<Press> = {}): Press => ({
  pointerType: 'mouse',
  startX: 0,
  startY: 500,
  startedAt: 0,
  startDistance: 0,
  size: 1000,
  viewport: 1000,
  isNoDragTarget: false,
  scrollerTakesGesture: false,
  ...overrides,
})

const closed = (
  config: Config<string> = defaultConfig('test', (s: string) => s, aria),
): M => defaultModel<string>(config)

// Open and run the enter animation to the end
const visible = (
  config: Config<string> = defaultConfig('test', (s: string) => s, aria),
): M => {
  const mounting = run(closed(config), { _tag: 'Open', internal: 'apple' })
  return run(
    mounting,
    { _tag: 'MountFrame', seq: mounting.seq },
    { _tag: 'TransitionEnd' },
  )
}

describe('open', () => {
  it('mounts at the closed position first', () => {
    const model = run(closed(), { _tag: 'Open', internal: 'apple' })
    expect(model.animate).toEqual({ _tag: 'Mounting', internal: 'apple' })
    expect(isOpen(model.animate)).toBe(true)
  })

  it('animates in on the next frame, then becomes visible', () => {
    const mounting = run(closed(), { _tag: 'Open', internal: 'apple' })
    const animating = run(mounting, { _tag: 'MountFrame', seq: mounting.seq })
    expect(animating.animate._tag).toBe('AnimateIn')
    expect(run(animating, { _tag: 'TransitionEnd' }).animate._tag).toBe(
      'Visible',
    )
  })

  it('ignores frames and timeouts of an interrupted animation', () => {
    const mounting = run(closed(), { _tag: 'Open', internal: 'apple' })
    const stale = run(mounting, { _tag: 'MountFrame', seq: mounting.seq - 1 })
    expect(stale.animate._tag).toBe('Mounting')

    const animating = run(mounting, { _tag: 'MountFrame', seq: mounting.seq })
    const timedOut = run(animating, {
      _tag: 'AnimationTimeout',
      seq: animating.seq - 1,
    })
    expect(timedOut.animate._tag).toBe('AnimateIn')
    expect(
      run(animating, { _tag: 'AnimationTimeout', seq: animating.seq }).animate
        ._tag,
    ).toBe('Visible')
  })

  it('only replaces the payload when already open', () => {
    const model = run(visible(), { _tag: 'Open', internal: 'banana' })
    expect(model.animate).toEqual({
      _tag: 'Visible',
      internal: 'banana',
      gesture: { _tag: 'Idle' },
    })
  })

  it('opens at the initial snap point', () => {
    const config = {
      ...defaultConfig('test', (s: string) => s, aria),
      snap: {
        _tag: 'Snap',
        // Opens at the second one
        initial: {
          before: [{ _tag: 'Fraction', value: 0.4 }],
          active: { _tag: 'Fraction', value: 1 },
          after: [],
        },
        fadeFrom: O.none,
        sequential: false,
      },
    } satisfies Config<string>
    expect(
      activeSnapIndex(
        run(closed(config), { _tag: 'Open', internal: 'a' }).snap,
      ),
    ).toBe(1)
  })
})

describe('open — skipAnimation', () => {
  const openAtRest: Msg<string> = {
    _tag: 'Open',
    internal: 'apple',
    skipAnimation: true,
  }

  it('is visible at once, at rest', () => {
    const model = run(closed(), openAtRest)
    expect(model.animate).toEqual({
      _tag: 'Visible',
      internal: 'apple',
      gesture: { _tag: 'Idle' },
    })
    expect(model.seq).toBe(closed().seq + 1)
  })

  it('opens at the initial snap point', () => {
    const config = {
      ...defaultConfig('test', (s: string) => s, aria),
      snap: {
        _tag: 'Snap',
        initial: {
          before: [{ _tag: 'Fraction', value: 0.4 }],
          active: { _tag: 'Fraction', value: 1 },
          after: [],
        },
        fadeFrom: O.none,
        sequential: false,
      },
    } satisfies Config<string>
    expect(activeSnapIndex(run(closed(config), openAtRest).snap)).toBe(1)
  })

  it('moves the focus in once painted, unless it has moved since', () => {
    const shown = run(closed(), openAtRest)
    const [same, cmd] = update({ _tag: 'FocusFrame', seq: shown.seq }, shown)
    expect(same).toEqual(shown)
    expect(cmd).not.toEqual(update({ _tag: 'NoOp' }, shown)[1])

    const closing = run(shown, { _tag: 'Close' })
    expect(update({ _tag: 'FocusFrame', seq: shown.seq }, closing)).toEqual(
      update({ _tag: 'NoOp' }, closing),
    )
    expect(update({ _tag: 'FocusFrame', seq: shown.seq - 1 }, shown)).toEqual(
      update({ _tag: 'NoOp' }, shown),
    )
  })

  it('closes with its animation', () => {
    const closing = run(closed(), openAtRest, { _tag: 'Close' })
    expect(closing.animate._tag).toBe('AnimateOut')
    expect(run(closing, { _tag: 'TransitionEnd' }).animate._tag).toBe(
      'Invisible',
    )
  })

  it('moves as usual when already on screen', () => {
    // Reopened while closing: reverses from where it is
    const closing = run(visible(), { _tag: 'Close' })
    expect(run(closing, openAtRest).animate._tag).toBe('AnimateIn')
    // Open: only the payload changes
    expect(
      run(visible(), { ...openAtRest, internal: 'banana' }).animate,
    ).toEqual({
      _tag: 'Visible',
      internal: 'banana',
      gesture: { _tag: 'Idle' },
    })
  })
})

describe('close', () => {
  it('keeps the payload while animating out', () => {
    const model = run(visible(), { _tag: 'Close' })
    expect(model.animate).toEqual({ _tag: 'AnimateOut', internal: 'apple' })
    expect(isOpen(model.animate)).toBe(false)
  })

  it('drops the payload once the animation ends', () => {
    const model = run(visible(), { _tag: 'Close' }, { _tag: 'TransitionEnd' })
    expect(model.animate).toEqual({ _tag: 'Invisible' })
  })

  it('unmounts directly when closed before the first frame', () => {
    const model = run(
      closed(),
      { _tag: 'Open', internal: 'apple' },
      { _tag: 'Close' },
    )
    expect(model.animate).toEqual({ _tag: 'Invisible' })
  })

  it('reverses when reopened while closing', () => {
    const model = run(
      visible(),
      { _tag: 'Close' },
      { _tag: 'Open', internal: 'banana' },
    )
    expect(model.animate).toEqual({ _tag: 'AnimateIn', internal: 'banana' })
  })

  it('reverses when closed while opening', () => {
    const mounting = run(closed(), { _tag: 'Open', internal: 'apple' })
    const model = run(
      mounting,
      { _tag: 'MountFrame', seq: mounting.seq },
      { _tag: 'Close' },
    )
    expect(model.animate._tag).toBe('AnimateOut')
  })

  it('ignores dismiss requests when not dismissible', () => {
    const config = {
      ...defaultConfig('test', (s: string) => s, aria),
      dismissible: false,
    }
    expect(run(visible(config), { _tag: 'Dismiss' }).animate._tag).toBe(
      'Visible',
    )
    expect(run(visible(config), { _tag: 'Close' }).animate._tag).toBe(
      'AnimateOut',
    )
  })

  it('resets the snap point once closed', () => {
    const config = {
      ...defaultConfig('test', (s: string) => s, aria),
      snap: {
        _tag: 'Snap',
        initial: {
          before: [],
          active: { _tag: 'Fraction', value: 0.4 },
          after: [{ _tag: 'Fraction', value: 1 }],
        },
        fadeFrom: O.none,
        sequential: false,
      },
    } satisfies Config<string>
    const model = run(
      visible(config),
      { _tag: 'SetSnap', index: 1 },
      { _tag: 'TransitionEnd' },
      { _tag: 'Close' },
      { _tag: 'TransitionEnd' },
    )
    expect(activeSnapIndex(model.snap)).toBe(0)
  })
})

describe('drag', () => {
  it('ignores presses while animating in', () => {
    const mounting = run(closed(), { _tag: 'Open', internal: 'apple' })
    const animating = run(mounting, { _tag: 'MountFrame', seq: mounting.seq })
    // `AnimateIn` can't hold a press at all
    const pressed = run(animating, { _tag: 'PointerDown', press: press() })
    expect(pressed.animate._tag).toBe('AnimateIn')
    expect(gestureTag(pressed)).toBe('None')
  })

  it('ignores presses when it can neither close nor snap', () => {
    const config = {
      ...defaultConfig('test', (s: string) => s, aria),
      dismissible: false,
    }
    expect(
      gestureTag(run(visible(config), { _tag: 'PointerDown', press: press() })),
    ).toBe('Idle')
  })

  it('becomes a drag once the pointer moves along the axis', () => {
    const model = run(
      visible(),
      { _tag: 'PointerDown', press: press() },
      { _tag: 'PointerMove', x: 0, y: 600, time: 100, hasSelection: false },
    )
    // `Dragging` holds the press; there is no separate gesture any more
    expect(gestureTag(model)).toBe('None')
    expect(model.animate).toMatchObject({ _tag: 'Dragging', distance: 100 })
  })

  it('leaves swipes across the axis to the content', () => {
    const model = run(
      visible(),
      { _tag: 'PointerDown', press: press({ pointerType: 'touch' }) },
      { _tag: 'PointerMove', x: 4, y: 501, time: 10, hasSelection: false },
      { _tag: 'PointerMove', x: 40, y: 502, time: 20, hasSelection: false },
    )
    expect(gestureTag(model)).toBe('Idle')
    expect(model.animate._tag).toBe('Visible')
  })

  it('waits for the pointer to travel past its noise before deciding', () => {
    const model = run(
      visible(),
      { _tag: 'PointerDown', press: press({ pointerType: 'touch' }) },
      // A wobble that used to start a drag on its first event
      { _tag: 'PointerMove', x: 1, y: 502, time: 10, hasSelection: false },
      { _tag: 'PointerMove', x: -1, y: 506, time: 20, hasSelection: false },
    )
    expect(gestureTag(model)).toBe('Pressed')
  })

  it('leaves a scroll of a side drawer to the content despite a drift', () => {
    const right = {
      ...defaultConfig('test', (s: string) => s, aria),
      direction: 'right' as const,
    }
    const model = run(
      visible(right),
      {
        _tag: 'PointerDown',
        press: press({ pointerType: 'touch', startX: 200, startY: 500 }),
      },
      // Back toward the open side (rubber band) by 1px, then mostly down
      { _tag: 'PointerMove', x: 199, y: 503, time: 10, hasSelection: false },
      { _tag: 'PointerMove', x: 197, y: 515, time: 20, hasSelection: false },
      // Decided once: no longer a candidate for a drag
      { _tag: 'PointerMove', x: 260, y: 516, time: 30, hasSelection: false },
    )
    expect(model.animate._tag).toBe('Visible')
    expect(gestureTag(model)).toBe('Idle')
  })

  it('drags a side drawer along its axis', () => {
    const right = {
      ...defaultConfig('test', (s: string) => s, aria),
      direction: 'right' as const,
    }
    const model = run(
      visible(right),
      {
        _tag: 'PointerDown',
        press: press({ pointerType: 'touch', startX: 200, startY: 500 }),
      },
      { _tag: 'PointerMove', x: 215, y: 506, time: 20, hasSelection: false },
    )
    expect(model.animate._tag).toBe('Dragging')
  })

  it('scrolls scrolled content instead of dragging', () => {
    const model = run(
      visible(),
      { _tag: 'PointerDown', press: press({ scrollerTakesGesture: true }) },
      { _tag: 'PointerMove', x: 0, y: 600, time: 100, hasSelection: false },
    )
    expect(model.animate._tag).toBe('Visible')
    expect(gestureTag(model)).toBe('Pressed')
    expect(model.lastDragPreventedAt).toEqual(O.some(100))
  })

  it('closes on a fast release, keeping the payload', () => {
    const model = run(
      visible(),
      { _tag: 'PointerDown', press: press() },
      { _tag: 'PointerMove', x: 0, y: 700, time: 50, hasSelection: false },
      { _tag: 'PointerUp', x: 0, y: 700, time: 60 },
    )
    expect(model.animate).toEqual({ _tag: 'AnimateOut', internal: 'apple' })
  })

  it('settles back after a short slow release', () => {
    const model = run(
      visible(),
      { _tag: 'PointerDown', press: press() },
      { _tag: 'PointerMove', x: 0, y: 550, time: 500, hasSelection: false },
      { _tag: 'PointerUp', x: 0, y: 550, time: 1000 },
    )
    expect(model.animate._tag).toBe('Settling')
    expect(run(model, { _tag: 'TransitionEnd' }).animate._tag).toBe('Visible')
  })

  it('releases at the last position on cancel', () => {
    const model = run(
      visible(),
      { _tag: 'PointerDown', press: press() },
      { _tag: 'PointerMove', x: 0, y: 900, time: 50, hasSelection: false },
      { _tag: 'PointerCancel', time: 60 },
    )
    expect(model.animate._tag).toBe('AnimateOut')
  })

  it('treats a release without movement as a tap', () => {
    const model = run(
      visible(),
      { _tag: 'PointerDown', press: press() },
      { _tag: 'PointerUp', x: 0, y: 500, time: 60 },
    )
    expect(model.animate._tag).toBe('Visible')
    expect(gestureTag(model)).toBe('Idle')
  })
})

describe('click after a drag', () => {
  it('swallows the click of a release that closes', () => {
    const model = run(
      visible(),
      { _tag: 'PointerDown', press: press() },
      { _tag: 'PointerMove', x: 0, y: 700, time: 50, hasSelection: false },
      { _tag: 'PointerUp', x: 0, y: 700, time: 60 },
    )
    expect(model.animate._tag).toBe('AnimateOut')
    expect(model.swallowNextClick).toBe(true)
  })

  it('swallows the click of a release that settles back', () => {
    const model = run(
      visible(),
      { _tag: 'PointerDown', press: press() },
      { _tag: 'PointerMove', x: 0, y: 550, time: 500, hasSelection: false },
      { _tag: 'PointerUp', x: 0, y: 550, time: 1000 },
    )
    expect(model.animate._tag).toBe('Settling')
    expect(model.swallowNextClick).toBe(true)
  })

  it('swallows the click of a cancelled drag', () => {
    const model = run(
      visible(),
      { _tag: 'PointerDown', press: press() },
      { _tag: 'PointerMove', x: 0, y: 550, time: 500, hasSelection: false },
      { _tag: 'PointerCancel', time: 1000 },
    )
    expect(model.swallowNextClick).toBe(true)
  })

  it('lets the click of a tap through', () => {
    const model = run(
      visible(),
      { _tag: 'PointerDown', press: press() },
      { _tag: 'PointerUp', x: 0, y: 500, time: 60 },
    )
    expect(model.swallowNextClick).toBe(false)
  })

  it('lets the click of a scroll of the content through', () => {
    const model = run(
      visible(),
      { _tag: 'PointerDown', press: press({ scrollerTakesGesture: true }) },
      { _tag: 'PointerMove', x: 0, y: 600, time: 100, hasSelection: false },
      { _tag: 'PointerUp', x: 0, y: 600, time: 200 },
    )
    expect(model.swallowNextClick).toBe(false)
  })

  const dragged = (): M =>
    run(
      visible(),
      { _tag: 'PointerDown', press: press() },
      { _tag: 'PointerMove', x: 0, y: 550, time: 500, hasSelection: false },
      { _tag: 'PointerUp', x: 0, y: 550, time: 1000 },
      { _tag: 'TransitionEnd' },
    )

  it('lets the click of the next press through', () => {
    const model = run(dragged(), { _tag: 'PointerDown', press: press() })
    expect(model.swallowNextClick).toBe(false)
  })

  it('lets the click of the next press through when it can’t drag', () => {
    const config = {
      ...defaultConfig('test', (s: string) => s, aria),
      dismissible: false,
    }
    const model = run(
      { ...visible(config), swallowNextClick: true },
      { _tag: 'PointerDown', press: press() },
    )
    expect(model.swallowNextClick).toBe(false)
  })

  it('lets the click of an ignored press through', () => {
    const model = run(dragged(), { _tag: 'PressIgnored' })
    expect(model.swallowNextClick).toBe(false)
    expect(model.animate._tag).toBe('Visible')
  })
})

describe('snap points', () => {
  const config = {
    ...defaultConfig('test', (s: string) => s, aria),
    snap: {
      _tag: 'Snap',
      initial: {
        before: [],
        active: { _tag: 'Fraction', value: 0.4 },
        after: [
          { _tag: 'Fraction', value: 0.7 },
          { _tag: 'Fraction', value: 1 },
        ],
      },
      fadeFrom: O.none,
      sequential: false,
    },
  } satisfies Config<string>

  it('settles on a new snap point', () => {
    const model = run(visible(config), { _tag: 'SetSnap', index: 2 })
    expect(activeSnapIndex(model.snap)).toBe(2)
    expect(model.animate._tag).toBe('Settling')
  })

  it('ignores invalid snap points', () => {
    const model = visible(config)
    expect(run(model, { _tag: 'SetSnap', index: 5 })).toBe(model)
    expect(run(model, { _tag: 'SetSnap', index: -1 })).toBe(model)
  })

  it('cycles through the snap points from the handle', () => {
    const settle = (m: M) => run(m, { _tag: 'TransitionEnd' })
    const once = settle(run(visible(config), { _tag: 'CycleSnap' }))
    expect(activeSnapIndex(once.snap)).toBe(1)
    const twice = settle(run(once, { _tag: 'CycleSnap' }))
    expect(activeSnapIndex(twice.snap)).toBe(2)
    expect(run(twice, { _tag: 'CycleSnap' }).animate._tag).toBe('AnimateOut')
  })

  it('snaps to the closest point on release', () => {
    const model = run(
      visible(config),
      { _tag: 'PointerDown', press: press({ startDistance: 600 }) },
      { _tag: 'PointerMove', x: 0, y: 200, time: 2000, hasSelection: false },
      { _tag: 'PointerUp', x: 0, y: 200, time: 4000 },
    )
    expect(activeSnapIndex(model.snap)).toBe(1)
    expect(model.animate._tag).toBe('Settling')
  })

  // The messages a message's commands send, by tag
  const sentTags = async (model: M, msg: Msg<string>): Promise<string[]> => {
    const sent: string[] = []
    update(msg, model)[1].execute((m) => sent.push(m._tag))
    await new Promise((resolve) => setTimeout(resolve, 0))
    return sent
  }

  it('notes when it reaches its last snap point, like vaul `openTime`', async () => {
    expect(
      await sentTags(visible(config), { _tag: 'SetSnap', index: 2 }),
    ).toContain('Opened')
    expect(
      await sentTags(visible(config), { _tag: 'SetSnap', index: 1 }),
    ).not.toContain('Opened')
  })

  it('notes when it opens', async () => {
    // Opening also remembers the focus and waits for a frame
    vi.stubGlobal('document', { activeElement: null })
    vi.stubGlobal('HTMLElement', class {})
    vi.stubGlobal('requestAnimationFrame', () => 0)
    try {
      expect(
        await sentTags(closed(config), { _tag: 'Open', internal: 'apple' }),
      ).toContain('Opened')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('keeps the time it opened, for `decideDrag`', () => {
    expect(
      run(visible(config), { _tag: 'Opened', time: 1234 }).openedAt,
    ).toEqual(O.some(1234))
  })

  describe('SetSnapPoints', () => {
    const atMiddle = () =>
      run(run(visible(config), { _tag: 'SetSnap', index: 1 }), {
        _tag: 'TransitionEnd',
      })

    it('moves to the new position of the active point', () => {
      const before = atMiddle()
      const model = run(before, {
        _tag: 'SetSnapPoints',
        points: [
          { _tag: 'Fraction', value: 0.4 },
          { _tag: 'Fraction', value: 0.8 },
          { _tag: 'Fraction', value: 1 },
        ],
      })
      expect(activeSnapIndex(model.snap)).toBe(1)
      expect(model.snap).toMatchObject({
        current: { active: { _tag: 'Fraction', value: 0.8 } },
      })
      expect(model.animate._tag).toBe('Settling')
      expect(model.seq).toBe(before.seq + 1)
    })

    it('stays at rest when only the other points change', () => {
      const before = atMiddle()
      const model = run(before, {
        _tag: 'SetSnapPoints',
        points: [
          { _tag: 'Pixel', value: 120 },
          { _tag: 'Fraction', value: 0.7 },
        ],
      })
      expect(model.animate._tag).toBe('Visible')
      expect(model.seq).toBe(before.seq)
      expect(model.snap).toMatchObject({
        current: {
          before: [{ _tag: 'Pixel', value: 120 }],
          after: [],
        },
      })
    })

    it('clamps the active point to fewer points', () => {
      const model = run(atMiddle(), {
        _tag: 'SetSnapPoints',
        points: [{ _tag: 'Fraction', value: 0.5 }],
      })
      expect(activeSnapIndex(model.snap)).toBe(0)
      expect(model.animate._tag).toBe('Settling')
    })

    it('replaces the points under the pointer without moving', () => {
      const dragging = run(
        visible(config),
        { _tag: 'PointerDown', press: press({ startDistance: 600 }) },
        { _tag: 'PointerMove', x: 0, y: 400, time: 100, hasSelection: false },
      )
      expect(dragging.animate._tag).toBe('Dragging')
      const model = run(dragging, {
        _tag: 'SetSnapPoints',
        points: [
          { _tag: 'Fraction', value: 0.3 },
          { _tag: 'Fraction', value: 1 },
        ],
      })
      expect(model.animate).toBe(dragging.animate)
      expect(model.snap).toMatchObject({
        current: { active: { _tag: 'Fraction', value: 0.3 } },
      })
    })

    it('keeps the same model for the same points', () => {
      const model = atMiddle()
      expect(
        run(model, {
          _tag: 'SetSnapPoints',
          points: [
            { _tag: 'Fraction', value: 0.4 },
            { _tag: 'Fraction', value: 0.7 },
            { _tag: 'Fraction', value: 1 },
          ],
        }),
      ).toBe(model)
    })

    it('is ignored while closed: every open starts from the config', () => {
      const model = closed(config)
      expect(
        run(model, {
          _tag: 'SetSnapPoints',
          points: [{ _tag: 'Fraction', value: 0.9 }],
        }),
      ).toBe(model)
    })

    it('resets to the config once closed', () => {
      const replaced = run(atMiddle(), {
        _tag: 'SetSnapPoints',
        points: [{ _tag: 'Fraction', value: 0.9 }],
      })
      const model = run(replaced, { _tag: 'Close' }, { _tag: 'TransitionEnd' })
      expect(model.animate._tag).toBe('Invisible')
      expect(model.snap).toEqual({
        _tag: 'Snap',
        current: config.snap.initial,
        fadeFrom: O.none,
        sequential: false,
      })
    })
  })
})

describe('impossible states', () => {
  it('has no snap position without snap points, and ignores SetSnap', () => {
    const model = visible()
    expect(model.snap).toEqual({ _tag: 'NoSnap' })
    expect(run(model, { _tag: 'SetSnap', index: 0 })).toBe(model)
    expect(
      run(model, {
        _tag: 'SetSnapPoints',
        points: [{ _tag: 'Fraction', value: 0.5 }],
      }),
    ).toBe(model)
  })

  it('keeps a press made while settling once it has settled', () => {
    const reopened = run(
      visible(),
      { _tag: 'Close' },
      { _tag: 'Open', internal: 'apple' },
    )
    const config = {
      ...defaultConfig('test', (s: string) => s, aria),
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
    } satisfies Config<string>
    const snapping = run(visible(config), { _tag: 'SetSnap', index: 1 })
    expect(snapping.animate._tag).toBe('Settling')
    const pressed = run(snapping, { _tag: 'PointerDown', press: press() })
    expect(gestureTag(pressed)).toBe('Pressed')
    expect(gestureTag(run(pressed, { _tag: 'TransitionEnd' }))).toBe('Pressed')
    // A reopened drawer animates in, which holds no press
    expect(gestureTag(reopened)).toBe('None')
  })
})

describe('payload helpers', () => {
  it('reads the current payload until the drawer is fully closed', () => {
    expect(getInternal(closed())).toEqual(O.none)
    expect(getInternal(visible())).toEqual(O.some('apple'))
    const closing = run(visible(), { _tag: 'Close' })
    expect(getInternal(closing)).toEqual(O.some('apple'))
    expect(getInternal(run(closing, { _tag: 'TransitionEnd' }))).toEqual(O.none)
  })

  it('getContent finds the payload by its key, while open and closing', () => {
    expect(getContent('apple')(visible())).toEqual(O.some('apple'))
    expect(getContent('apple')(run(visible(), { _tag: 'Close' }))).toEqual(
      O.some('apple'),
    )
    expect(getContent('banana')(visible())).toEqual(O.none)
    expect(getContent('apple')(closed())).toEqual(O.none)
  })

  it('a reply for a payload replaced while closing does not reach the new one', () => {
    // Opened for apple, closing, reopened for banana before it has closed
    const reopened = run(
      visible(),
      { _tag: 'Close' },
      { _tag: 'Open', internal: 'banana' },
    )
    expect(getInternal(reopened)).toEqual(O.some('banana'))
    // A late reply from apple's content
    expect(getContent('apple')(reopened)).toEqual(O.none)
    expect(modifyContent('apple', () => 'apple!')(reopened)).toBe(reopened)
  })

  it('a reply for a payload replaced while open does not reach the new one', () => {
    const replaced = run(visible(), { _tag: 'Open', internal: 'cherry' })
    expect(getContent('apple')(replaced)).toEqual(O.none)
    expect(getContent('cherry')(replaced)).toEqual(O.some('cherry'))
  })

  it('modifyContent updates the payload without touching the animation', () => {
    // Keys are the first letter here, so an update can keep the key
    const config = defaultConfig('test', (s: string) => s[0], aria)
    const open = run(closed(config), { _tag: 'Open', internal: 'apple' })
    const model = modifyContent('a', (s: string) => `${s} pie`)(open)
    expect(model.animate).toEqual({ _tag: 'Mounting', internal: 'apple pie' })
  })

  it('modifyContent refuses a key change and does nothing once closed', () => {
    const model = visible()
    expect(modifyContent('apple', () => 'banana')(model)).toBe(model)
    const shut = closed()
    expect(modifyContent('apple', () => 'apple')(shut)).toBe(shut)
  })

  it('ContentMsg is left to the owner', () => {
    const model = visible()
    expect(
      update<string, string>(
        { _tag: 'ContentMsg', key: 'apple', msg: 'hello' },
        model,
      )[0],
    ).toBe(model)
  })
})

describe('getPropsEq', () => {
  const props = (
    internal: string,
    parent: string,
  ): Props<string, never, string> => ({
    model: run(visible(), { _tag: 'Open', internal }),
    dispatch: () => {},
    renderContent: () => null,
    itemEq: S.Eq,
    parent,
    parentEq: S.Eq,
  })
  const eq = getPropsEq<string, never, string>(S.Eq, S.Eq)

  it('ignores renderContent and dispatch identity', () => {
    expect(eq.equals(props('a', 'p'), props('a', 'p'))).toBe(true)
  })

  it('sees payload and parent changes', () => {
    expect(eq.equals(props('a', 'p'), props('b', 'p'))).toBe(false)
    expect(eq.equals(props('a', 'p'), props('a', 'q'))).toBe(false)
  })
})
