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

// The drawer views holding the lock (each by its own id, not the drawer's
// `Config.id`); the body is restored when the last one lets go. A view holds
// it at most once, so holding or releasing twice is harmless. Keying by view
// means a view whose model is swapped for one with another id (an owner
// reusing the view for other data) still releases what it held, and two
// views of models sharing an id can't release each other's hold.
const lockHolders = new Set<string>()

// Set on the body while it is locked: `drawer.css` hides its overflow
const bodyLockAttribute = 'data-drawer-scroll-lock'

let previousBodyStyle: {
  position: string
  top: string
  left: string
  right: string
  height: string
  paddingRight: string
} | null = null

let lockedScroll = { x: 0, y: 0 }

let isPositionFixed = false

// Counts the body locks, so a check scheduled by one lock is skipped once it
// was released (or replaced by a newer one)
let lockGeneration = 0

// All browsers on iOS report as Safari.
const isSafari = (): boolean =>
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches

// Whether the window itself scrolls (vaul's case), not only containers inside
// the page (e.g. an app shell whose body is the viewport's height)
const isWindowScrollable = (): boolean => {
  const root = document.scrollingElement ?? document.documentElement
  return root.scrollHeight > window.innerHeight
}

const lockBodyScroll = (id: string): void => {
  if (lockHolders.has(id)) {
    // Held already
  } else {
    lockHolders.add(id)
    if (lockHolders.size === 1) {
      lockGeneration += 1
      const generation = lockGeneration
      const body = document.body
      previousBodyStyle = {
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
      // An attribute (`drawer.css`), not the inline `overflow`: another lock
      // on the body (e.g. a dialog's, released in the same moment) saves and
      // restores the inline style, and would undo or keep this one
      body.setAttribute(bodyLockAttribute, '')

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
        })
        if (isWindowScrollable()) {
          // The pinned body keeps the whole page's height, shifted up by the
          // window's scroll
          body.style.height = 'auto'
        } else {
          // The page scrolls inside its own containers, sized from the
          // body's height: `auto` would grow them to their content, and
          // they would lose their scroll position
        }
        window.setTimeout(
          () =>
            window.requestAnimationFrame(() => {
              // Attempt to check if the bottom bar appeared due to the
              // position change. Not once this lock is released: the body's
              // `top` would then shift the page.
              const isStillLocked =
                isPositionFixed && generation === lockGeneration
              const bottomBarHeight = innerHeight - window.innerHeight
              if (
                isStillLocked &&
                bottomBarHeight &&
                lockedScroll.y >= innerHeight
              ) {
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
      document.body.removeAttribute(bodyLockAttribute)
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

// The view `viewId` shows the drawer: hold the body scroll lock while it does
// (modal drawers only)
export const holdBodyLock = (viewId: string, config: Config): void => {
  if (usesBodyLock(config)) {
    lockBodyScroll(viewId)
  } else {
    // Non-modal drawers leave the page scrollable
  }
}

// The view `viewId` stopped showing the drawer (it closed, its owner replaced
// the model, or the view was removed): release its hold on the body scroll
// lock, and give the focus back if it was left in the drawer. Releasing what
// was already released is a no-op.
export const releaseDrawer = (viewId: string, config: Config): void => {
  unlockBodyScroll(viewId)
  restoreFocus(config)
}

// On-screen keyboard
// ---------------------------------

// Space (px) kept above a drawer shrunk to fit above the keyboard (vaul's)
const keyboardTopOffset = 26

// Visual viewport shrinks this much or more: the keyboard is open (smaller
// changes come from the browser's toolbars)
const keyboardMinHeight = 60

const nonTextInputTypes = new Set([
  'checkbox',
  'radio',
  'range',
  'color',
  'file',
  'image',
  'button',
  'submit',
  'reset',
])

const isTextField = (element: Element): boolean =>
  (element instanceof HTMLInputElement &&
    !nonTextInputTypes.has(element.type)) ||
  element instanceof HTMLTextAreaElement ||
  (element instanceof HTMLElement && element.isContentEditable)

// Keep a bottom drawer's text field above the on-screen keyboard: once one
// of its fields is focused with the keyboard open, the drawer sits on top of
// the keyboard, capped to the visible height, until the keyboard closes.
// Only the keyboard closing (a viewport resize) puts it back: dropping it as
// soon as the field loses focus would move it under the finger in the middle
// of a tap on one of its buttons, and the tap would be lost. Returns the
// cleanup, which puts the drawer back on the bottom edge.
export const followKeyboard = (config: Config): (() => void) => {
  const viewport = window.visualViewport
  if (
    viewport === null ||
    !config.repositionInputs ||
    config.direction !== 'bottom'
  ) {
    return () => {}
  } else {
    const content = () => document.getElementById(contentDomId(config.id))
    const keyboardHeight = () =>
      Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
    const isFieldFocusedIn = (element: HTMLElement): boolean => {
      const active = document.activeElement
      return active !== null && element.contains(active) && isTextField(active)
    }
    const lift = (element: HTMLElement) => {
      element.style.bottom = `${keyboardHeight()}px`
      element.style.maxHeight = `${viewport.height - keyboardTopOffset}px`
    }
    const reset = () => {
      const element = content()
      if (element === null) {
        // Not rendered (closed in the meantime)
      } else {
        element.style.bottom = ''
        element.style.maxHeight = ''
      }
    }
    // The keyboard opened, closed or changed size
    const onResize = () => {
      const element = content()
      if (element === null) {
        // Not rendered (closed in the meantime)
      } else if (keyboardHeight() < keyboardMinHeight) {
        reset()
      } else if (isFieldFocusedIn(element) || element.style.bottom !== '') {
        lift(element)
      } else {
        // The keyboard is for a field outside the drawer
      }
    }
    // A field of the drawer focused while the keyboard is already open
    // (moving from another field doesn't resize the viewport)
    const onFocusIn = () => {
      const element = content()
      if (
        element !== null &&
        keyboardHeight() >= keyboardMinHeight &&
        isFieldFocusedIn(element)
      ) {
        lift(element)
      } else {
        // Not one of its fields, or no keyboard
      }
    }
    viewport.addEventListener('resize', onResize)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      viewport.removeEventListener('resize', onResize)
      document.removeEventListener('focusin', onFocusIn)
      reset()
    }
  }
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
