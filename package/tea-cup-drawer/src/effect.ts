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
SOFTWARE.

The Safari body positioning is ported from vaul's `usePositionFixed`
(https://github.com/emilkowalski/vaul), Copyright (c) 2023 Emil Kowalski,
MIT License. */
import { cmdFromPromise, performIO_ } from '@rinn7e/tea-cup-prelude'
import { type Cmd } from 'tea-cup-fp'

import { type Config } from './type'
import { contentDomId, isModal, locksBody } from './util'

// Frames
// ---------------------------------

// Browsers throttle `requestAnimationFrame` in hidden tabs (down to ~1s), so
// don't wait for a paint longer than this.
const maxPaintWaitMs = 100

// Resolves once the drawer, rendered at its closed position, has its style
// computed, so switching it to the open position runs the transition.
// Normally that is after the next paint; if no frame comes in time, a forced
// reflow commits the style instead.
const afterNextPaint = (config: Config) => (): Promise<void> =>
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
      document.getElementById(contentDomId(config.id))?.getBoundingClientRect()
      finish()
    }, maxPaintWaitMs)
  })

export const afterNextPaintCmd = <Msg>(config: Config, msg: Msg): Cmd<Msg> =>
  cmdFromPromise(afterNextPaint(config), () => msg)

// Body scroll lock
// ---------------------------------

// The modal drawers holding the lock, by `Config.id`; the body is restored
// when the last one lets go. A drawer holds it once: releasing twice (its view
// was removed while closing, then its model finished closing) is harmless.
const lockHolders = new Set<string>()

let previousBodyStyle: {
  overflow: string
  position: string
  top: string
  left: string
  right: string
  height: string
  paddingRight: string
} | null = null

let lockedScroll = { x: 0, y: 0 }

let isPositionFixed = false

// All browsers on iOS report as Safari.
const isSafari = (): boolean =>
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches

const lockBodyScroll = (id: string): void => {
  if (lockHolders.has(id)) {
    // Held already
  } else {
    lockHolders.add(id)
    if (lockHolders.size === 1) {
      const body = document.body
      previousBodyStyle = {
        overflow: body.style.overflow,
        position: body.style.position,
        top: body.style.top,
        left: body.style.left,
        right: body.style.right,
        height: body.style.height,
        paddingRight: body.style.paddingRight,
      }
      lockedScroll = { x: window.scrollX, y: window.scrollY }
      // Hiding the overflow removes the page scrollbar; pad the body by its
      // width so the layout doesn't shift
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth
      if (scrollbarWidth > 0) {
        const paddingRight = parseFloat(getComputedStyle(body).paddingRight)
        body.style.paddingRight = `${paddingRight + scrollbarWidth}px`
      } else {
        // Overlay scrollbars (mobile, macOS default) take no space
      }
      body.style.overflow = 'hidden'

      // `overflow: hidden` doesn't stop iOS Safari from scrolling the page
      // (and shifting its toolbar) behind the drawer; pinning the body does.
      // Skipped in standalone mode (PWA), which has no toolbar.
      if (isSafari() && !isStandalone()) {
        isPositionFixed = true
        const { innerHeight } = window
        body.style.setProperty('position', 'fixed', 'important')
        Object.assign(body.style, {
          top: `${-lockedScroll.y}px`,
          left: `${-lockedScroll.x}px`,
          right: '0px',
          height: 'auto',
        })
        window.setTimeout(
          () =>
            window.requestAnimationFrame(() => {
              // Attempt to check if the bottom bar appeared due to the
              // position change
              const bottomBarHeight = innerHeight - window.innerHeight
              if (bottomBarHeight && lockedScroll.y >= innerHeight) {
                // Move the content further up so that the bottom bar doesn't
                // hide it
                body.style.top = `${-(lockedScroll.y + bottomBarHeight)}px`
              }
            }),
          300,
        )
      } else {
        isPositionFixed = false
      }
    } else {
      // Already locked by another drawer
    }
  }
}

const unlockBodyScroll = (id: string): void => {
  if (!lockHolders.has(id)) {
    // Not held (released already)
  } else {
    lockHolders.delete(id)
    if (lockHolders.size === 0 && previousBodyStyle !== null) {
      Object.assign(document.body.style, previousBodyStyle)
      previousBodyStyle = null
      if (isPositionFixed) {
        isPositionFixed = false
        const { x, y } = lockedScroll
        window.requestAnimationFrame(() => window.scrollTo(x, y))
      } else {
        // The page never moved
      }
    } else {
      // Another drawer still holds the lock
    }
  }
}

const usesBodyLock = (config: Config): boolean => locksBody(config)

export const lockBodyScrollCmd = (config: Config): Cmd<{ _tag: 'NoOp' }> =>
  performIO_(() => {
    if (usesBodyLock(config)) {
      lockBodyScroll(config.id)
    } else {
      // Non-modal drawers leave the page scrollable
    }
  })

export const unlockBodyScrollCmd = (config: Config): Cmd<{ _tag: 'NoOp' }> =>
  performIO_(() => {
    if (usesBodyLock(config)) {
      unlockBodyScroll(config.id)
    } else {
      // Nothing was locked
    }
  })

// Focus
// ---------------------------------

// Element focused before each drawer opened, keyed by `Config.id`
const previousFocus = new Map<string, HTMLElement>()

// On open: remember where the focus was
export const rememberFocusCmd = (config: Config): Cmd<{ _tag: 'NoOp' }> =>
  performIO_(() => {
    const active = document.activeElement
    if (active instanceof HTMLElement) {
      previousFocus.set(config.id, active)
    } else {
      previousFocus.delete(config.id)
    }
  })

// Once fully closed: give the focus back, unless it already moved on (e.g.
// to a drawer opened while this one was closing)
const restoreFocus = (config: Config): void => {
  const element = previousFocus.get(config.id)
  previousFocus.delete(config.id)
  const content = document.getElementById(contentDomId(config.id))
  const active = document.activeElement
  // Still in this drawer, or lost with its removed content
  const isFocusLeftBehind =
    active === null ||
    active === document.body ||
    (content !== null && content.contains(active))
  if (element && element.isConnected && isFocusLeftBehind) {
    element.focus({ preventScroll: true })
  } else {
    // Nothing to return focus to, or the focus is elsewhere now
  }
}

export const restoreFocusCmd = (config: Config): Cmd<{ _tag: 'NoOp' }> =>
  performIO_(() => restoreFocus(config))

// The drawer's view was removed while it was still open or closing (e.g. its
// owner, a list item, was removed), so closing never finished: release what
// opening took, the body scroll lock and the saved focus.
export const releaseOnUnmount = (config: Config): void => {
  if (usesBodyLock(config)) {
    unlockBodyScroll(config.id)
  } else {
    // Nothing was locked
  }
  restoreFocus(config)
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',')

const focusableElements = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(focusableSelector))

// Move focus into the drawer on open: to the drawer itself, or to its first
// focusable element with `autoFocus`. Non-modal drawers only take focus with
// `autoFocus`.
export const focusContentCmd = (config: Config): Cmd<{ _tag: 'NoOp' }> =>
  performIO_(() => {
    const content = document.getElementById(contentDomId(config.id))
    if (content === null) {
      // Not rendered (closed in the meantime)
    } else if (config.autoFocus) {
      const first = focusableElements(content)[0]
      if (first) {
        first.focus({ preventScroll: true })
      } else {
        content.focus({ preventScroll: true })
      }
    } else if (isModal(config)) {
      content.focus({ preventScroll: true })
    } else {
      // Non-modal drawers don't steal focus
    }
  })
