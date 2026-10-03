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
  type Model,
  type Msg,
  type Props,
  canPop,
  containerHeight,
  defaultConfig,
  defaultModel,
  depth,
  fromPanel,
  getPropsEq,
  getScreen,
  getTop,
  modifyScreen,
  panelOffsetPercent,
  panels,
  screens,
  setTop,
  update,
} from '../src'

type M = Model<string>

// Screens are strings that are their own key; screen messages are strings
const config = (durationMs: number = 300): Config<string> => ({
  ...defaultConfig('test', (screen: string) => screen),
  durationMs,
})

const run = (model: M, ...msgs: Msg<string, string>[]): M =>
  msgs.reduce((m, msg) => update(msg, m)[0], model)

const root = (c: Config<string> = config()): M => defaultModel(c, 'main')

// Run the started transition to the end
const finish = (model: M): M =>
  run(model, { _tag: 'Frame', seq: model.seq }, { _tag: 'TransitionEnd' })

const pushed = (model: M, screen: string): M =>
  finish(run(model, { _tag: 'Push', screen }))

const measure = (model: M, index: number, height: number): M =>
  run(model, { _tag: 'HeightMeasured', depth: index, height })

// Screen and depth of the rendered panels, in DOM order
const rendered = (model: M) =>
  panels(model).map((p) => `${p.depth}:${p.entry.screen}:${p.role}`)

describe('defaults', () => {
  it('starts idle on the root screen', () => {
    const model = root()
    expect(screens(model)).toEqual(['main'])
    expect(model.transition).toEqual({ _tag: 'Idle' })
    expect(model.config.durationMs).toBe(300)
    expect(depth(model)).toBe(0)
    expect(canPop(model)).toBe(false)
  })
})

describe('Push', () => {
  it('holds the previous top in the transition while the new one slides in', () => {
    const model = run(root(), { _tag: 'Push', screen: 'moveTo' })
    expect(getTop(model)).toBe('moveTo')
    expect(model.below).toEqual([])
    expect(model.transition).toEqual({
      _tag: 'Pushing',
      previous: { screen: 'main', height: O.none },
      phase: 'Start',
    })
    expect(depth(model)).toBe(1)
    expect(screens(model)).toEqual(['main', 'moveTo'])
    expect(rendered(model)).toEqual(['0:main:From', '1:moveTo:Top'])
    expect(model.seq).toBe(1)
  })

  it('runs after the start frame; the previous top joins `below` once done', () => {
    const start = run(root(), { _tag: 'Push', screen: 'moveTo' })
    const running = run(start, { _tag: 'Frame', seq: start.seq })
    expect(running.transition).toMatchObject({ phase: 'Run' })
    const done = run(running, { _tag: 'TransitionEnd' })
    expect(done.transition).toEqual({ _tag: 'Idle' })
    expect(done.below.map((e) => e.screen)).toEqual(['main'])
    expect(depth(done)).toBe(1)
    expect(canPop(done)).toBe(true)
    expect(rendered(done)).toEqual(['1:moveTo:Top'])
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
    const model = run(root(config(0)), {
      _tag: 'Push',
      screen: 'moveTo',
    })
    expect(screens(model)).toEqual(['main', 'moveTo'])
    expect(model.transition).toEqual({ _tag: 'Idle' })
  })
})

describe('Pop', () => {
  it('is a no-op on the root screen', () => {
    const model = root()
    expect(run(model, { _tag: 'Pop' })).toBe(model)
  })

  it('removes the top screen but keeps it in the transition while it slides away', () => {
    const model = run(pushed(root(), 'moveTo'), { _tag: 'Pop' })
    expect(screens(model)).toEqual(['main'])
    expect(model.transition).toEqual({
      _tag: 'Popping',
      popped: [{ screen: 'moveTo', height: O.none }],
      phase: 'Start',
    })
    expect(rendered(model)).toEqual(['0:main:Top', '1:moveTo:From'])
    expect(finish(model).transition).toEqual({ _tag: 'Idle' })
    expect(rendered(finish(model))).toEqual(['0:main:Top'])
  })

  it('keeps the state of the screen it returns to', () => {
    const edited = setTop('main (edited)')(root())
    const done = finish(run(pushed(edited, 'moveTo'), { _tag: 'Pop' }))
    expect(screens(done)).toEqual(['main (edited)'])
  })

  it('switches at once with durationMs 0', () => {
    const model = run(
      root(config(0)),
      { _tag: 'Push', screen: 'moveTo' },
      { _tag: 'Pop' },
    )
    expect(screens(model)).toEqual(['main'])
    expect(model.transition).toEqual({ _tag: 'Idle' })
  })
})

describe('PopTo', () => {
  const deep = (): M => pushed(pushed(root(), 'a'), 'b')

  it('slides straight from the top to the target, the screens in between ride along unseen', () => {
    const model = run(deep(), { _tag: 'PopTo', depth: 0 })
    expect(screens(model)).toEqual(['main'])
    expect(model.transition).toMatchObject({ _tag: 'Popping' })
    // Only the old top is rendered, at its own depth
    expect(rendered(model)).toEqual(['0:main:Top', '2:b:From'])
    expect(O.map((p: { depth: number }) => p.depth)(fromPanel(model))).toEqual(
      O.some(2),
    )
    expect(screens(finish(model))).toEqual(['main'])
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
    expect(screens(model)).toEqual(['main', 'confirm'])
    expect(model.transition).toEqual({ _tag: 'Idle' })
  })

  it('keeps a running transition', () => {
    const start = run(root(), { _tag: 'Push', screen: 'moveTo' })
    const model = run(start, { _tag: 'Replace', screen: 'confirm' })
    expect(screens(model)).toEqual(['main', 'confirm'])
    expect(model.transition).toEqual(start.transition)
  })
})

describe('interruptions', () => {
  it('Push while pushing finishes the running push first', () => {
    const first = run(root(), { _tag: 'Push', screen: 'a' })
    const second = run(first, { _tag: 'Push', screen: 'b' })
    expect(screens(second)).toEqual(['main', 'a', 'b'])
    expect(second.below.map((e) => e.screen)).toEqual(['main'])
    expect(second.transition).toMatchObject({
      _tag: 'Pushing',
      previous: { screen: 'a' },
    })
    expect(second.seq).toBe(first.seq + 1)
  })

  it('Pop while pushing slides back from the pushed screen', () => {
    const pushing = run(root(), { _tag: 'Push', screen: 'a' })
    const popping = run(pushing, { _tag: 'Pop' })
    expect(screens(popping)).toEqual(['main'])
    expect(rendered(popping)).toEqual(['0:main:Top', '1:a:From'])
  })

  it('Push while popping drops the popped screen', () => {
    const popping = run(pushed(root(), 'a'), { _tag: 'Pop' })
    const model = run(popping, { _tag: 'Push', screen: 'b' })
    expect(screens(model)).toEqual(['main', 'b'])
    expect(rendered(model)).toEqual(['0:main:From', '1:b:Top'])
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
    const done = finish(model)
    expect(screens(done)).toEqual(['main'])
    expect(done.below).toEqual([])
    expect(done.transition).toEqual({ _tag: 'Idle' })
  })
})

describe('HeightMeasured', () => {
  it('stores the height with the screen', () => {
    expect(measure(root(), 0, 120).top.height).toEqual(O.some(120))
  })

  it('returns the same model when the height is unchanged', () => {
    const model = measure(root(), 0, 120)
    expect(measure(model, 0, 120)).toBe(model)
  })

  it('ignores screens that are not rendered', () => {
    const model = root()
    expect(measure(model, 3, 80)).toBe(model)
    // `main` is underneath, not rendered
    const deeper = pushed(model, 'a')
    expect(measure(deeper, 0, 80)).toBe(deeper)
  })

  it('measures the screen being pushed over and keeps its height', () => {
    const pushing = run(measure(root(), 0, 120), { _tag: 'Push', screen: 'a' })
    const measured = measure(pushing, 0, 125)
    expect(measured.transition).toMatchObject({
      previous: { height: O.some(125) },
    })
    expect(finish(measured).below[0].height).toEqual(O.some(125))
  })

  it('measures the screen sliding away; its height leaves with it', () => {
    const popping = run(measure(pushed(root(), 'a'), 1, 300), { _tag: 'Pop' })
    const measured = measure(popping, 1, 310)
    expect(measured.transition).toMatchObject({
      popped: [{ height: O.some(310) }],
    })
    expect(finish(measured).top.height).toEqual(O.none)
  })
})

describe('unique keys', () => {
  it('ignores a push of a key already in the stack', () => {
    const model = pushed(root(), 'a')
    expect(run(model, { _tag: 'Push', screen: 'main' })).toBe(model)
    expect(run(model, { _tag: 'Push', screen: 'a' })).toBe(model)
  })

  it('allows pushing again a key that is only sliding away', () => {
    const popping = run(pushed(root(), 'a'), { _tag: 'Pop' })
    const model = run(popping, { _tag: 'Push', screen: 'a' })
    expect(screens(model)).toEqual(['main', 'a'])
  })

  it('ignores a replace or setTop with the key of another screen', () => {
    const model = pushed(root(), 'a')
    expect(run(model, { _tag: 'Replace', screen: 'main' })).toBe(model)
    expect(setTop('main')(model)).toBe(model)
    // Its own key is fine
    expect(screens(setTop('a')(model))).toEqual(['main', 'a'])
  })
})

describe('ScreenMsg', () => {
  it('is left to the parent', () => {
    const model = pushed(root(), 'a')
    expect(run(model, { _tag: 'ScreenMsg', key: 'a', msg: 'hello' })).toBe(
      model,
    )
  })
})

describe('getScreen / modifyScreen', () => {
  // Screens with a key and a counter, to see updates
  type Counter = { key: string; count: number }
  const counterConfig = defaultConfig('test', (c: Counter) => c.key)
  const counter = (key: string): Counter => ({ key, count: 0 })
  const bump = (c: Counter): Counter => ({ ...c, count: c.count + 1 })
  const runC = (model: Model<Counter>, msg: Msg<Counter>): Model<Counter> =>
    update(msg, model)[0]
  const finishC = (model: Model<Counter>) =>
    runC(runC(model, { _tag: 'Frame', seq: model.seq }), {
      _tag: 'TransitionEnd',
    })
  const pushC = (model: Model<Counter>, key: string) =>
    runC(model, { _tag: 'Push', screen: counter(key) })
  const base = () =>
    finishC(pushC(defaultModel(counterConfig, counter('main')), 'moveTo'))

  it('finds a screen underneath the top, and updates it there', () => {
    const model = finishC(pushC(base(), 'newFolder'))
    expect(getScreen('moveTo')(model)).toEqual(O.some(counter('moveTo')))
    const bumped = modifyScreen('moveTo', bump)(model)
    expect(getScreen('moveTo')(bumped)).toEqual(
      O.some({ key: 'moveTo', count: 1 }),
    )
    expect(getTop(bumped)).toEqual(counter('newFolder'))
  })

  it('finds the screen being pushed over', () => {
    const bumped = modifyScreen('moveTo', bump)(pushC(base(), 'newFolder'))
    expect(getScreen('moveTo')(bumped)).toEqual(
      O.some({ key: 'moveTo', count: 1 }),
    )
  })

  it('finds a popped screen while it slides away, not after', () => {
    const popping = runC(base(), { _tag: 'Pop' })
    const bumped = modifyScreen('moveTo', bump)(popping)
    expect(bumped.transition).toMatchObject({
      popped: [{ screen: { key: 'moveTo', count: 1 } }],
    })
    expect(getScreen('moveTo')(finishC(popping))).toEqual(O.none)
  })

  it('returns the same model for a missing key or a key change', () => {
    const model = base()
    expect(modifyScreen('gone', bump)(model)).toBe(model)
    expect(
      modifyScreen('moveTo', (c: Counter) => ({ ...c, key: 'other' }))(model),
    ).toBe(model)
  })
})

describe('view helpers', () => {
  it('animates the container from the outgoing to the incoming height', () => {
    const start = run(measure(root(), 0, 120), { _tag: 'Push', screen: 'a' })
    expect(containerHeight(start)).toEqual(O.some(120))
    const running = measure(
      run(start, { _tag: 'Frame', seq: start.seq }),
      1,
      300,
    )
    expect(containerHeight(running)).toEqual(O.some(300))
    expect(containerHeight(run(running, { _tag: 'TransitionEnd' }))).toEqual(
      O.some(300),
    )
  })

  it('follows the height of the screen on show while idle', () => {
    expect(containerHeight(measure(root(), 0, 200))).toEqual(O.some(200))
  })

  it('falls back to the natural height when a height is unknown', () => {
    expect(containerHeight(root())).toEqual(O.none)
    expect(containerHeight(run(root(), { _tag: 'Push', screen: 'a' }))).toEqual(
      O.none,
    )
  })

  it('places the panels for each phase', () => {
    const push = run(root(), { _tag: 'Push', screen: 'a' })
    expect(panelOffsetPercent(push.transition, 'Top')).toBe(100)
    expect(panelOffsetPercent(push.transition, 'From')).toBe(0)
    const pushRun = run(push, { _tag: 'Frame', seq: push.seq })
    expect(panelOffsetPercent(pushRun.transition, 'Top')).toBe(0)
    expect(panelOffsetPercent(pushRun.transition, 'From')).toBe(-30)

    const pop = run(pushed(root(), 'a'), { _tag: 'Pop' })
    expect(panelOffsetPercent(pop.transition, 'Top')).toBe(-30)
    expect(panelOffsetPercent(pop.transition, 'From')).toBe(0)
    const popRun = run(pop, { _tag: 'Frame', seq: pop.seq })
    expect(panelOffsetPercent(popRun.transition, 'Top')).toBe(0)
    expect(panelOffsetPercent(popRun.transition, 'From')).toBe(100)
  })
})

describe('setTop', () => {
  it('replaces only the top screen and keeps its height', () => {
    const model = setTop('a2')(measure(pushed(root(), 'a'), 1, 50))
    expect(screens(model)).toEqual(['main', 'a2'])
    expect(model.top.height).toEqual(O.some(50))
  })
})

describe('getPropsEq', () => {
  const props = (model: M): Props<string, string, null> => ({
    model,
    dispatch: () => {},
    renderScreen: () => null,
    itemEq: S.Eq,
    parent: null,
    parentEq: nullEq,
  })
  const eq = getPropsEq<string, string, null>(S.Eq, nullEq)

  it('is equal for an equal model, whatever the functions', () => {
    expect(eq.equals(props(root()), props(root()))).toBe(true)
  })

  it('differs when a screen, the transition or a height change', () => {
    const model = pushed(root(), 'a')
    expect(eq.equals(props(model), props(setTop('b')(model)))).toBe(false)
    expect(eq.equals(props(model), props(run(model, { _tag: 'Pop' })))).toBe(
      false,
    )
    expect(eq.equals(props(model), props(measure(model, 1, 1)))).toBe(false)
  })
})
