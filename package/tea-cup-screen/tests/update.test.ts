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
import { nullEq } from '@rinn7e/tea-cup-prelude'
import * as O from 'fp-ts/lib/Option'
import * as S from 'fp-ts/lib/string'
import { describe, expect, it } from 'vitest'

import {
  type Config,
  type Msg,
  type Props,
  type Stack,
  canPop,
  containerHeight,
  defaultConfig,
  defaultModel,
  depth,
  fromDepth,
  getPropsEq,
  getTop,
  panelOffsetPercent,
  setTop,
  update,
} from '../src'

type M = Stack<string>

const run = (model: M, ...msgs: Msg<string>[]): M =>
  msgs.reduce((m, msg) => update(msg, m)[0], model)

const root = (config: Config = defaultConfig('test')): M =>
  defaultModel(config, 'main')

// Push and run the transition to the end
const pushed = (model: M, screen: string): M => {
  const start = run(model, { _tag: 'Push', screen })
  return run(
    start,
    { _tag: 'Frame', seq: start.seq },
    { _tag: 'TransitionEnd' },
  )
}

describe('defaults', () => {
  it('starts idle on the root screen', () => {
    const model = root()
    expect(model.stack).toEqual(['main'])
    expect(model.transition).toEqual({ _tag: 'Idle' })
    expect(model.config.durationMs).toBe(300)
    expect(depth(model)).toBe(0)
    expect(canPop(model)).toBe(false)
  })
})

describe('Push', () => {
  it('adds the screen and starts sliding forward from the previous top', () => {
    const model = run(root(), { _tag: 'Push', screen: 'moveTo' })
    expect(model.stack).toEqual(['main', 'moveTo'])
    expect(model.transition).toEqual({
      _tag: 'Sliding',
      from: 'main',
      fromDepth: 0,
      direction: 'Forward',
      phase: 'Start',
    })
    expect(model.seq).toBe(1)
    expect(fromDepth(model)).toEqual(O.some(0))
  })

  it('runs after the start frame and settles on transitionend', () => {
    const start = run(root(), { _tag: 'Push', screen: 'moveTo' })
    const running = run(start, { _tag: 'Frame', seq: start.seq })
    expect(running.transition).toMatchObject({ phase: 'Run' })
    const done = run(running, { _tag: 'TransitionEnd' })
    expect(done.transition).toEqual({ _tag: 'Idle' })
    expect(getTop(done)).toBe('moveTo')
    expect(canPop(done)).toBe(true)
  })

  it('ignores transitionend before the transition runs', () => {
    const start = run(root(), { _tag: 'Push', screen: 'moveTo' })
    expect(run(start, { _tag: 'TransitionEnd' })).toBe(start)
  })

  it('settles on the timeout when transitionend never fires', () => {
    const start = run(root(), { _tag: 'Push', screen: 'moveTo' })
    const running = run(start, { _tag: 'Frame', seq: start.seq })
    const done = run(running, { _tag: 'TransitionTimeout', seq: start.seq })
    expect(done.transition).toEqual({ _tag: 'Idle' })
  })

  it('switches at once with durationMs 0', () => {
    const model = run(root({ id: 'test', durationMs: 0 }), {
      _tag: 'Push',
      screen: 'moveTo',
    })
    expect(model.stack).toEqual(['main', 'moveTo'])
    expect(model.transition).toEqual({ _tag: 'Idle' })
  })
})

describe('Pop', () => {
  it('is a no-op on the root screen', () => {
    const model = root()
    const [next, cmd] = update({ _tag: 'Pop' }, model)
    expect(next).toBe(model)
    expect(cmd).toBeDefined()
  })

  it('removes the top screen but keeps it as `from` while it slides away', () => {
    const model = run(pushed(root(), 'moveTo'), { _tag: 'Pop' })
    expect(model.stack).toEqual(['main'])
    expect(model.transition).toEqual({
      _tag: 'Sliding',
      from: 'moveTo',
      fromDepth: 1,
      direction: 'Back',
      phase: 'Start',
    })
    expect(fromDepth(model)).toEqual(O.some(1))
  })

  it('keeps the state of the screen it returns to', () => {
    const edited = setTop('main (edited)')(root())
    const back = pushed(edited, 'moveTo')
    const start = run(back, { _tag: 'Pop' })
    const done = run(
      start,
      { _tag: 'Frame', seq: start.seq },
      { _tag: 'TransitionEnd' },
    )
    expect(done.stack).toEqual(['main (edited)'])
    expect(done.transition).toEqual({ _tag: 'Idle' })
  })

  it('switches at once with durationMs 0', () => {
    const config = { id: 'test', durationMs: 0 }
    const model = run(
      root(config),
      { _tag: 'Push', screen: 'moveTo' },
      { _tag: 'Pop' },
    )
    expect(model.stack).toEqual(['main'])
    expect(model.transition).toEqual({ _tag: 'Idle' })
  })
})

describe('PopTo', () => {
  const deep = (): M => pushed(pushed(root(), 'a'), 'b')

  it('slides straight from the top to the target, discarding the screens in between', () => {
    const model = run(deep(), { _tag: 'PopTo', depth: 0 })
    expect(model.stack).toEqual(['main'])
    expect(model.transition).toEqual({
      _tag: 'Sliding',
      from: 'b',
      fromDepth: 2,
      direction: 'Back',
      phase: 'Start',
    })
    expect(fromDepth(model)).toEqual(O.some(2))
  })

  it('keeps the height of the outgoing screen until it has slid away', () => {
    const measured = run(deep(), {
      _tag: 'HeightMeasured',
      depth: 2,
      height: 300,
    })
    const popping = run(measured, { _tag: 'PopTo', depth: 0 })
    expect(popping.heights['2']).toBe(300)
    expect(
      run(popping, { _tag: 'HeightMeasured', depth: 2, height: 310 }).heights[
        '2'
      ],
    ).toBe(310)
    const done = run(
      popping,
      { _tag: 'Frame', seq: popping.seq },
      { _tag: 'TransitionEnd' },
    )
    expect(done.heights['2']).toBeUndefined()
  })

  it('is a no-op for the current depth, deeper or negative depths', () => {
    const model = deep()
    expect(run(model, { _tag: 'PopTo', depth: 2 })).toBe(model)
    expect(run(model, { _tag: 'PopTo', depth: 5 })).toBe(model)
    expect(run(model, { _tag: 'PopTo', depth: -1 })).toBe(model)
  })

  it('Pop is PopTo the screen below', () => {
    const model = deep()
    expect(run(model, { _tag: 'Pop' })).toEqual(
      run(model, { _tag: 'PopTo', depth: 1 }),
    )
  })
})

describe('Replace', () => {
  it('swaps the top screen without animation', () => {
    const model = run(pushed(root(), 'moveTo'), {
      _tag: 'Replace',
      screen: 'confirm',
    })
    expect(model.stack).toEqual(['main', 'confirm'])
    expect(model.transition).toEqual({ _tag: 'Idle' })
  })

  it('keeps a running transition', () => {
    const start = run(root(), { _tag: 'Push', screen: 'moveTo' })
    const model = run(start, { _tag: 'Replace', screen: 'confirm' })
    expect(model.stack).toEqual(['main', 'confirm'])
    expect(model.transition).toEqual(start.transition)
  })
})

describe('interruptions', () => {
  it('Push while sliding finishes the running transition first', () => {
    const first = run(root(), { _tag: 'Push', screen: 'a' })
    const second = run(first, { _tag: 'Push', screen: 'b' })
    expect(second.stack).toEqual(['main', 'a', 'b'])
    expect(second.transition).toEqual({
      _tag: 'Sliding',
      from: 'a',
      fromDepth: 1,
      direction: 'Forward',
      phase: 'Start',
    })
    expect(second.seq).toBe(first.seq + 1)
  })

  it('Pop while pushing slides back from the pushed screen', () => {
    const pushing = run(root(), { _tag: 'Push', screen: 'a' })
    const running = run(pushing, { _tag: 'Frame', seq: pushing.seq })
    const popping = run(running, { _tag: 'Pop' })
    expect(popping.stack).toEqual(['main'])
    expect(popping.transition).toEqual({
      _tag: 'Sliding',
      from: 'a',
      fromDepth: 1,
      direction: 'Back',
      phase: 'Start',
    })
  })

  it('Push while popping drops the popped screen', () => {
    const popping = run(pushed(root(), 'a'), { _tag: 'Pop' })
    const model = run(popping, { _tag: 'Push', screen: 'b' })
    expect(model.stack).toEqual(['main', 'b'])
    expect(model.transition).toMatchObject({
      from: 'main',
      direction: 'Forward',
    })
  })

  it('ignores the frame and timeout of an interrupted transition', () => {
    const first = run(root(), { _tag: 'Push', screen: 'a' })
    const second = run(first, { _tag: 'Push', screen: 'b' })
    expect(run(second, { _tag: 'Frame', seq: first.seq })).toBe(second)
    const running = run(second, { _tag: 'Frame', seq: second.seq })
    expect(run(running, { _tag: 'TransitionTimeout', seq: first.seq })).toBe(
      running,
    )
  })

  it('ends consistent after rapid pushes and pops', () => {
    const model = run(
      root(),
      { _tag: 'Push', screen: 'a' },
      { _tag: 'Pop' },
      { _tag: 'Push', screen: 'b' },
      { _tag: 'Push', screen: 'c' },
      { _tag: 'Pop' },
      { _tag: 'Pop' },
      { _tag: 'Pop' },
    )
    const done = run(
      model,
      { _tag: 'Frame', seq: model.seq },
      { _tag: 'TransitionEnd' },
    )
    expect(done.stack).toEqual(['main'])
    expect(done.transition).toEqual({ _tag: 'Idle' })
  })
})

describe('HeightMeasured', () => {
  it('stores the height of a rendered screen', () => {
    const model = run(root(), { _tag: 'HeightMeasured', depth: 0, height: 120 })
    expect(model.heights).toEqual({ '0': 120 })
  })

  it('returns the same model when the height is unchanged', () => {
    const model = run(root(), { _tag: 'HeightMeasured', depth: 0, height: 120 })
    expect(run(model, { _tag: 'HeightMeasured', depth: 0, height: 120 })).toBe(
      model,
    )
  })

  it('ignores screens that are not rendered', () => {
    const model = root()
    expect(run(model, { _tag: 'HeightMeasured', depth: 3, height: 80 })).toBe(
      model,
    )
  })

  it('accepts the outgoing screen while it slides away, drops it after', () => {
    // Each screen is measured while it is rendered
    const measured = run(
      pushed(
        run(root(), { _tag: 'HeightMeasured', depth: 0, height: 120 }),
        'a',
      ),
      { _tag: 'HeightMeasured', depth: 1, height: 300 },
    )
    const popping = run(measured, { _tag: 'Pop' })
    expect(popping.heights).toEqual({ '0': 120, '1': 300 })
    const updated = run(popping, {
      _tag: 'HeightMeasured',
      depth: 1,
      height: 310,
    })
    expect(updated.heights).toEqual({ '0': 120, '1': 310 })
    const done = run(
      updated,
      { _tag: 'Frame', seq: updated.seq },
      { _tag: 'TransitionEnd' },
    )
    expect(done.heights).toEqual({ '0': 120 })
  })
})

describe('view helpers', () => {
  const measured = (model: M): M =>
    run(
      model,
      { _tag: 'HeightMeasured', depth: 0, height: 120 },
      { _tag: 'HeightMeasured', depth: 1, height: 300 },
    )

  it('animates the container from the outgoing to the incoming height', () => {
    const start = measured(run(root(), { _tag: 'Push', screen: 'a' }))
    expect(containerHeight(start)).toEqual(O.some(120))
    const running = run(start, { _tag: 'Frame', seq: start.seq })
    expect(containerHeight(running)).toEqual(O.some(300))
    const done = run(running, { _tag: 'TransitionEnd' })
    expect(containerHeight(done)).toEqual(O.some(300))
  })

  it('follows the height of the screen on show while idle', () => {
    const model = run(root(), { _tag: 'HeightMeasured', depth: 0, height: 120 })
    expect(containerHeight(model)).toEqual(O.some(120))
    const grown = run(model, { _tag: 'HeightMeasured', depth: 0, height: 200 })
    expect(containerHeight(grown)).toEqual(O.some(200))
  })

  it('falls back to the natural height when a height is unknown', () => {
    expect(containerHeight(root())).toEqual(O.none)
    const start = run(root(), { _tag: 'Push', screen: 'a' })
    expect(containerHeight(start)).toEqual(O.none)
  })

  it('places the panels for each phase', () => {
    const forward = run(root(), { _tag: 'Push', screen: 'a' })
    expect(panelOffsetPercent(forward.transition, 'Top')).toBe(100)
    expect(panelOffsetPercent(forward.transition, 'From')).toBe(0)
    const forwardRun = run(forward, { _tag: 'Frame', seq: forward.seq })
    expect(panelOffsetPercent(forwardRun.transition, 'Top')).toBe(0)
    expect(panelOffsetPercent(forwardRun.transition, 'From')).toBe(-30)

    const back = run(pushed(root(), 'a'), { _tag: 'Pop' })
    expect(panelOffsetPercent(back.transition, 'Top')).toBe(-30)
    expect(panelOffsetPercent(back.transition, 'From')).toBe(0)
    const backRun = run(back, { _tag: 'Frame', seq: back.seq })
    expect(panelOffsetPercent(backRun.transition, 'Top')).toBe(0)
    expect(panelOffsetPercent(backRun.transition, 'From')).toBe(100)
  })
})

describe('setTop', () => {
  it('replaces only the top screen', () => {
    const model = setTop('a2')(pushed(root(), 'a'))
    expect(model.stack).toEqual(['main', 'a2'])
  })
})

describe('getPropsEq', () => {
  const props = (model: M, parent: null = null): Props<string, null> => ({
    model,
    dispatch: () => {},
    renderScreen: () => null,
    itemEq: S.Eq,
    parent,
    parentEq: nullEq,
  })
  const eq = getPropsEq(S.Eq, nullEq)

  it('is equal for an equal model, whatever the functions', () => {
    expect(eq.equals(props(root()), props(root()))).toBe(true)
  })

  it('differs when the stack or the transition change', () => {
    const model = pushed(root(), 'a')
    expect(eq.equals(props(model), props(setTop('b')(model)))).toBe(false)
    expect(eq.equals(props(model), props(run(model, { _tag: 'Pop' })))).toBe(
      false,
    )
  })

  it('differs when a height changes', () => {
    const model = root()
    const measured = run(model, { _tag: 'HeightMeasured', depth: 0, height: 1 })
    expect(eq.equals(props(model), props(measured))).toBe(false)
  })
})
