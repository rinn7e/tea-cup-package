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
// Shared by the tests of the scroll container's state machine: who holds the
// position (`follow`) and what the view must do to the engine
// (`pendingAdjust`), for each cause. The engine itself can't run in these
// tests (it measures the DOM): `view.test.tsx` runs the view in jsdom, and
// the example app the list in a browser.
import * as SC from '../src'

export const chat = SC.chatConfig
export const feed = SC.feedConfig
export const send = (
  config: SC.Config,
  msg: SC.Msg,
  model: SC.Model,
): SC.Model => SC.update(config)(msg, model)[0]

export const now = 1_000
export const atEnd = SC.init({ _tag: 'AtEnd' })
export const free = SC.init({
  _tag: 'Free',
  anchor: { key: 'm5', offset: -20 },
})
export const geometry = {
  scrollTop: 500,
  scrollHeight: 3000,
  clientHeight: 600,
}

export const scrollTo = (
  target: SC.Target,
  behavior: SC.Behavior = 'smooth',
): SC.Msg => ({ _tag: 'ScrollTo', target, behavior, now, hide: false })
export const toKey = (key: string): SC.Target => ({
  _tag: 'Key',
  key,
  offset: 0,
  onlyIfHidden: false,
})
export const settled = (
  atEnd: boolean,
  at: number = now + 100,
  anchor: SC.Anchor | null = { key: 'm9', offset: 0 },
): SC.Msg => ({ _tag: 'ScrollSettled', geometry, anchor, atEnd, now: at })
export const command = (model: SC.Model) => model.pendingAdjust?.command ?? null
export const restore = (key: string, offset: number): SC.Msg => ({
  _tag: 'Restore',
  anchor: { key, offset },
  hide: false,
})
