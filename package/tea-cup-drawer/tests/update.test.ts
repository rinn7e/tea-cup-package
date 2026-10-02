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
import { describe, expect, it } from 'vitest'

import {
  type Config,
  type Model,
  type Msg,
  type Press,
  defaultConfig,
  defaultModel,
  isOpen,
  update,
} from '../src'

type M = Model<string>

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
  hasScrolledAncestor: false,
  ...overrides,
})

const closed = (config: Config = defaultConfig('test')): M =>
  defaultModel<string>(config)

// Open and run the enter animation to the end
const visible = (config: Config = defaultConfig('test')): M => {
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
    expect(model.animate).toEqual({ _tag: 'Visible', internal: 'banana' })
  })

  it('opens at the initial snap point', () => {
    const config = {
      ...defaultConfig('test'),
      snapPoints: [
        { _tag: 'Fraction', value: 0.4 },
        { _tag: 'Fraction', value: 1 },
      ],
      initialSnap: 1,
    } satisfies Config
    expect(
      run(closed(config), { _tag: 'Open', internal: 'a' }).activeSnap,
    ).toBe(1)
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
    const config = { ...defaultConfig('test'), dismissible: false }
    expect(run(visible(config), { _tag: 'Dismiss' }).animate._tag).toBe(
      'Visible',
    )
    expect(run(visible(config), { _tag: 'Close' }).animate._tag).toBe(
      'AnimateOut',
    )
  })

  it('resets the snap point once closed', () => {
    const config = {
      ...defaultConfig('test'),
      snapPoints: [
        { _tag: 'Fraction', value: 0.4 },
        { _tag: 'Fraction', value: 1 },
      ],
    } satisfies Config
    const model = run(
      visible(config),
      { _tag: 'SetSnap', index: 1 },
      { _tag: 'TransitionEnd' },
      { _tag: 'Close' },
      { _tag: 'TransitionEnd' },
    )
    expect(model.activeSnap).toBe(0)
  })
})

describe('drag', () => {
  it('ignores presses while animating in', () => {
    const mounting = run(closed(), { _tag: 'Open', internal: 'apple' })
    const animating = run(mounting, { _tag: 'MountFrame', seq: mounting.seq })
    expect(
      run(animating, { _tag: 'PointerDown', press: press() }).gesture._tag,
    ).toBe('Idle')
  })

  it('ignores presses when it can neither close nor snap', () => {
    const config = { ...defaultConfig('test'), dismissible: false }
    expect(
      run(visible(config), { _tag: 'PointerDown', press: press() }).gesture
        ._tag,
    ).toBe('Idle')
  })

  it('becomes a drag once the pointer moves along the axis', () => {
    const model = run(
      visible(),
      { _tag: 'PointerDown', press: press() },
      { _tag: 'PointerMove', x: 0, y: 600, time: 100, hasSelection: false },
    )
    expect(model.gesture._tag).toBe('Idle')
    expect(model.animate).toMatchObject({ _tag: 'Dragging', distance: 100 })
  })

  it('leaves swipes across the axis to the content', () => {
    const model = run(
      visible(),
      { _tag: 'PointerDown', press: press({ pointerType: 'touch' }) },
      { _tag: 'PointerMove', x: 4, y: 501, time: 10, hasSelection: false },
      { _tag: 'PointerMove', x: 40, y: 502, time: 20, hasSelection: false },
    )
    expect(model.gesture._tag).toBe('Idle')
    expect(model.animate._tag).toBe('Visible')
  })

  it('scrolls scrolled content instead of dragging', () => {
    const model = run(
      visible(),
      { _tag: 'PointerDown', press: press({ hasScrolledAncestor: true }) },
      { _tag: 'PointerMove', x: 0, y: 600, time: 100, hasSelection: false },
    )
    expect(model.animate._tag).toBe('Visible')
    expect(model.gesture._tag).toBe('Pressed')
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
    expect(model.gesture._tag).toBe('Idle')
  })
})

describe('snap points', () => {
  const config = {
    ...defaultConfig('test'),
    snapPoints: [
      { _tag: 'Fraction', value: 0.4 },
      { _tag: 'Fraction', value: 0.7 },
      { _tag: 'Fraction', value: 1 },
    ],
  } satisfies Config

  it('settles on a new snap point', () => {
    const model = run(visible(config), { _tag: 'SetSnap', index: 2 })
    expect(model.activeSnap).toBe(2)
    expect(model.animate._tag).toBe('Settling')
  })

  it('ignores invalid snap points', () => {
    expect(run(visible(config), { _tag: 'SetSnap', index: 5 }).activeSnap).toBe(
      0,
    )
  })

  it('cycles through the snap points from the handle', () => {
    const settle = (m: M) => run(m, { _tag: 'TransitionEnd' })
    const once = settle(run(visible(config), { _tag: 'CycleSnap' }))
    expect(once.activeSnap).toBe(1)
    const twice = settle(run(once, { _tag: 'CycleSnap' }))
    expect(twice.activeSnap).toBe(2)
    expect(run(twice, { _tag: 'CycleSnap' }).animate._tag).toBe('AnimateOut')
  })

  it('snaps to the closest point on release', () => {
    const model = run(
      visible(config),
      { _tag: 'PointerDown', press: press({ startDistance: 600 }) },
      { _tag: 'PointerMove', x: 0, y: 200, time: 2000, hasSelection: false },
      { _tag: 'PointerUp', x: 0, y: 200, time: 4000 },
    )
    expect(model.activeSnap).toBe(1)
    expect(model.animate._tag).toBe('Settling')
  })
})
