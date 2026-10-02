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
  type Press,
  decideDrag,
  decideRelease,
  defaultConfig,
  defaultModel,
  dragDistance,
  draggedDistance,
  isDeltaInDirection,
  overlayOpacity,
  overlayOpacityAt,
  snapDistanceCss,
  snapDistancePx,
  translateCss,
} from '../src'

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

const snapConfig = (overrides: Partial<Config> = {}): Config => ({
  ...defaultConfig('snap'),
  snapPoints: [
    { _tag: 'Fraction', value: 0.4 },
    { _tag: 'Fraction', value: 1 },
  ],
  ...overrides,
})

describe('draggedDistance', () => {
  it('is positive when pulling a bottom drawer up (open)', () => {
    expect(draggedDistance('bottom', press(), 0, 400)).toBe(100)
    expect(draggedDistance('bottom', press(), 0, 600)).toBe(-100)
  })

  it('follows the closing direction of each edge', () => {
    expect(draggedDistance('top', press(), 0, 600)).toBe(100)
    expect(draggedDistance('right', press({ startX: 500 }), 400, 0)).toBe(100)
    expect(draggedDistance('left', press({ startX: 500 }), 600, 0)).toBe(100)
  })
})

describe('snap points', () => {
  it('converts snap points to closing distances', () => {
    expect(snapDistancePx({ _tag: 'Fraction', value: 0.4 }, 1000)).toBe(600)
    expect(snapDistancePx({ _tag: 'Pixel', value: 300 }, 1000)).toBe(700)
    expect(snapDistanceCss({ _tag: 'Fraction', value: 0.25 })).toBe('75%')
    expect(snapDistanceCss({ _tag: 'Pixel', value: 300 })).toBe(
      'calc(100% - 300px)',
    )
  })
})

describe('dragDistance', () => {
  const config = defaultConfig('basic')

  it('follows the pointer toward the closed position', () => {
    expect(dragDistance(config, press(), -100)).toBe(100)
  })

  it('rubber-bands past the open position', () => {
    const distance = dragDistance(config, press(), 50)
    expect(distance).toBeLessThan(0)
    expect(distance).toBeGreaterThan(-50)
    // Tiny pulls don't move the drawer at all
    expect(dragDistance(config, press(), 3)).toBe(-0)
  })

  it('starts from where the drawer was when pressed', () => {
    expect(dragDistance(config, press({ startDistance: 200 }), -100)).toBe(300)
  })

  it('clamps between the snap points', () => {
    const start = press({ startDistance: 600 })
    expect(dragDistance(snapConfig(), start, 700)).toBe(0)
    expect(dragDistance(snapConfig(), start, -200)).toBe(800)
    expect(dragDistance(snapConfig({ dismissible: false }), start, -200)).toBe(
      600,
    )
  })
})

describe('isDeltaInDirection', () => {
  it('ignores tiny moves across the axis', () => {
    expect(isDeltaInDirection('bottom', 2, 1, 10)).toBe(false)
    expect(isDeltaInDirection('bottom', 1, 2, 10)).toBe(true)
  })

  it('accepts any move past the threshold or toward open', () => {
    expect(isDeltaInDirection('bottom', 30, 20, 10)).toBe(true)
    expect(isDeltaInDirection('bottom', 5, -1, 10)).toBe(true)
  })
})

describe('decideDrag', () => {
  const config = defaultConfig('basic')
  const args = {
    isDraggingInDirection: false,
    hasSelection: false,
    time: 1000,
    lastDragPreventedAt: O.none,
  }

  it('drags by default', () => {
    expect(decideDrag(config, press(), args)).toEqual({
      allow: true,
      lastDragPreventedAt: O.none,
    })
  })

  it('never drags from no-drag targets', () => {
    expect(
      decideDrag(config, press({ isNoDragTarget: true }), args).allow,
    ).toBe(false)
  })

  it('always drags horizontal drawers', () => {
    expect(
      decideDrag({ ...config, direction: 'left' }, press(), {
        ...args,
        isDraggingInDirection: true,
      }).allow,
    ).toBe(true)
  })

  it('leaves selected text alone', () => {
    expect(
      decideDrag(config, press(), { ...args, hasSelection: true }).allow,
    ).toBe(false)
  })

  it('scrolls the content when pulling an open drawer further open', () => {
    expect(
      decideDrag(config, press(), { ...args, isDraggingInDirection: true }),
    ).toEqual({ allow: false, lastDragPreventedAt: O.some(1000) })
  })

  it('scrolls scrolled content back first', () => {
    expect(
      decideDrag(config, press({ hasScrolledAncestor: true }), args),
    ).toEqual({ allow: false, lastDragPreventedAt: O.some(1000) })
  })

  it('stays disabled right after a scroll', () => {
    expect(
      decideDrag(config, press(), {
        ...args,
        lastDragPreventedAt: O.some(950),
      }),
    ).toEqual({ allow: false, lastDragPreventedAt: O.some(1000) })
    expect(
      decideDrag(config, press(), {
        ...args,
        lastDragPreventedAt: O.some(800),
      }).allow,
    ).toBe(true)
  })

  it('always drags a drawer that is away from its open position', () => {
    expect(
      decideDrag(config, press({ startDistance: 600 }), {
        ...args,
        isDraggingInDirection: true,
        hasSelection: true,
      }).allow,
    ).toBe(true)
  })
})

describe('decideRelease without snap points', () => {
  const config = defaultConfig('basic')

  it('closes after a slow drag past the threshold', () => {
    expect(
      decideRelease(config, 0, press(), { x: 0, y: 800, time: 3000 }),
    ).toEqual({ _tag: 'Close' })
  })

  it('springs back after a short slow drag', () => {
    expect(
      decideRelease(config, 0, press(), { x: 0, y: 600, time: 3000 }),
    ).toEqual({ _tag: 'Reset' })
  })

  it('closes on a flick', () => {
    expect(
      decideRelease(config, 0, press(), { x: 0, y: 600, time: 50 }),
    ).toEqual({ _tag: 'Close' })
  })

  it('springs back when dragged toward open', () => {
    expect(
      decideRelease(config, 0, press(), { x: 0, y: 100, time: 50 }),
    ).toEqual({ _tag: 'Reset' })
  })
})

describe('decideRelease with snap points', () => {
  const atFirst = press({ startDistance: 600 })
  const atLast = press({ startDistance: 0 })

  it('snaps to the closest point after a slow drag', () => {
    expect(
      decideRelease(snapConfig(), 0, atFirst, { x: 0, y: 0, time: 5000 }),
    ).toEqual({ _tag: 'Snap', index: 1 })
    expect(
      decideRelease(snapConfig(), 1, atLast, { x: 0, y: 700, time: 5000 }),
    ).toEqual({ _tag: 'Snap', index: 1 })
  })

  it('closes on a strong flick down when dismissible', () => {
    expect(
      decideRelease(snapConfig(), 1, atLast, { x: 0, y: 700, time: 50 }),
    ).toEqual({ _tag: 'Close' })
    expect(
      decideRelease(snapConfig({ dismissible: false }), 1, atLast, {
        x: 0,
        y: 700,
        time: 50,
      }),
    ).toEqual({ _tag: 'Snap', index: 0 })
  })

  it('jumps to the last point on a strong flick up', () => {
    expect(
      decideRelease(snapConfig(), 0, atFirst, { x: 0, y: 400, time: 50 }),
    ).toEqual({ _tag: 'Snap', index: 1 })
  })

  it('moves one point on a medium flick', () => {
    expect(
      decideRelease(snapConfig(), 0, atFirst, { x: 0, y: 300, time: 400 }),
    ).toEqual({ _tag: 'Snap', index: 1 })
    expect(
      decideRelease(snapConfig(), 0, atFirst, { x: 0, y: 700, time: 400 }),
    ).toEqual({ _tag: 'Close' })
  })
})

describe('overlay opacity', () => {
  it('fades over the drawer size without snap points', () => {
    const config = defaultConfig('basic')
    expect(overlayOpacityAt(config, 1000, 0)).toBe(1)
    expect(overlayOpacityAt(config, 1000, 250)).toBe(0.75)
    expect(overlayOpacityAt(config, 1000, 2000)).toBe(0)
  })

  it('fades in between the snap point before fadeFromIndex and it', () => {
    expect(overlayOpacityAt(snapConfig(), 1000, 600)).toBe(0)
    expect(overlayOpacityAt(snapConfig(), 1000, 300)).toBe(0.5)
    expect(overlayOpacityAt(snapConfig(), 1000, 0)).toBe(1)
  })
})

describe('rendering', () => {
  const visible = (config: Config, activeSnap: number): Model<string> => ({
    ...defaultModel<string>(config),
    activeSnap,
    animate: { _tag: 'Visible', internal: 'x' },
  })

  it('renders closed states fully translated', () => {
    expect(translateCss(defaultModel(defaultConfig('a')))).toBe('100%')
  })

  it('renders the active snap point at rest', () => {
    expect(translateCss(visible(defaultConfig('a'), 0))).toBe('0px')
    expect(translateCss(visible(snapConfig(), 0))).toBe('60%')
    expect(overlayOpacity(visible(snapConfig(), 0))).toBe(0)
    expect(overlayOpacity(visible(snapConfig(), 1))).toBe(1)
  })

  it('renders the pointer position while dragging', () => {
    const model: Model<string> = {
      ...defaultModel(defaultConfig('a')),
      animate: {
        _tag: 'Dragging',
        internal: 'x',
        press: press(),
        distance: 120,
        last: { x: 0, y: 620 },
      },
    }
    expect(translateCss(model)).toBe('120px')
    expect(overlayOpacity(model)).toBe(0.88)
  })
})
