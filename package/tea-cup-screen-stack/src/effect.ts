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
import { cmdFromPromise } from '@rinn7e/tea-cup-prelude'
import { type Cmd } from 'tea-cup-fp'

import { containerDomId, panelDomId } from './util'

// Frames
// ---------------------------------

// Browsers throttle `requestAnimationFrame` in hidden tabs (down to ~1s), so
// don't wait for a paint longer than this.
const maxPaintWaitMs = 100

// Resolves once the screens, rendered at their start positions, have their
// style computed, so switching them to their end positions runs the
// transition. Normally that is after the next paint; if no frame comes in
// time, a forced reflow commits the style instead.
const afterNextPaint = (config: { id: string }) => (): Promise<void> =>
  new Promise((resolve) => {
    let isDone = false
    const finish = () => {
      if (isDone) {
        // Already resolved by the other path
      } else {
        isDone = true
        resolve()
      }
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(finish)
    })
    window.setTimeout(() => {
      document
        .getElementById(containerDomId(config.id))
        ?.getBoundingClientRect()
      finish()
    }, maxPaintWaitMs)
  })

export const afterNextPaintCmd = <Msg>(
  config: { id: string },
  msg: Msg,
): Cmd<Msg> => cmdFromPromise(afterNextPaint(config), () => msg)

// Focus
// ---------------------------------

// Move the focus to the screen on show, but only when it was inside the
// stack (on a button of the screen that just left) or nowhere: never steal
// it from the rest of the page. Waits for a paint, so the screen is rendered
// even when it was switched without animation.
export const focusTopCmd = (
  config: { id: string },
  index: number,
): Cmd<{ _tag: 'NoOp' }> =>
  cmdFromPromise(
    async () => {
      await afterNextPaint(config)()
      const container = document.getElementById(containerDomId(config.id))
      const panel = document.getElementById(panelDomId(config.id, index))
      const active = document.activeElement
      const isFocusFree =
        active === null ||
        active === document.body ||
        (container !== null && container.contains(active))
      if (panel !== null && isFocusFree && !panel.contains(active)) {
        panel.focus({ preventScroll: true })
      } else {
        // Gone, or the focus belongs to something else
      }
    },
    () => ({ _tag: 'NoOp' }) as const,
  )
