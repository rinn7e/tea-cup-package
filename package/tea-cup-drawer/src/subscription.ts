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
import { DocumentEvents } from 'react-tea-cup'
import { Sub } from 'tea-cup-fp'

import { focusableElements } from './effect'
import { type Config, type Model, type Msg } from './type'
import { contentDomId, isOpen } from './util'

export const documentEvents = new DocumentEvents()

const hasSelection = (): boolean => {
  const selection = window.getSelection()
  return selection !== null && selection.toString().length > 0
}

// Follow the pointer on the whole document while a gesture is in progress,
// so the drag continues when the pointer leaves the drawer.
const gestureSubscriptions = <A>(): Sub<Msg<A>> =>
  Sub.batch<Msg<A>>([
    documentEvents.on(
      'pointermove',
      (e): Msg<A> =>
        e.isPrimary
          ? {
              _tag: 'PointerMove',
              x: e.pageX,
              y: e.pageY,
              time: e.timeStamp,
              hasSelection: hasSelection(),
            }
          : { _tag: 'NoOp' },
    ),
    documentEvents.on(
      'pointerup',
      (e): Msg<A> =>
        e.isPrimary
          ? { _tag: 'PointerUp', x: e.pageX, y: e.pageY, time: e.timeStamp }
          : { _tag: 'NoOp' },
    ),
    documentEvents.on(
      'pointercancel',
      (e): Msg<A> =>
        e.isPrimary
          ? { _tag: 'PointerCancel', time: e.timeStamp }
          : { _tag: 'NoOp' },
    ),
    documentEvents.on(
      'contextmenu',
      (e): Msg<A> => ({ _tag: 'PointerCancel', time: e.timeStamp }),
    ),
  ])

// Keep Tab / Shift+Tab inside a modal drawer.
const trapFocus = (content: HTMLElement, e: KeyboardEvent): void => {
  const focusables = focusableElements(content)
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  const active = document.activeElement
  if (first === undefined || last === undefined) {
    e.preventDefault()
    content.focus({ preventScroll: true })
  } else if (!content.contains(active)) {
    e.preventDefault()
    first.focus({ preventScroll: true })
  } else if (e.shiftKey && (active === first || active === content)) {
    e.preventDefault()
    last.focus({ preventScroll: true })
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus({ preventScroll: true })
  } else {
    // Regular tab between elements inside the drawer
  }
}

const keyboardSubscriptions = <A>(config: Config): Sub<Msg<A>> =>
  documentEvents.on('keydown', (e): Msg<A> => {
    const content = document.getElementById(contentDomId(config.id))
    // Only the drawer holding the focus reacts, so stacked drawers close
    // one at a time
    const hasFocus =
      content !== null && content.contains(document.activeElement)
    if (content === null) {
      return { _tag: 'NoOp' }
    } else if (e.key === 'Escape' && hasFocus) {
      e.preventDefault()
      return { _tag: 'Dismiss' }
    } else if (e.key === 'Tab' && config.modal) {
      trapFocus(content, e)
      return { _tag: 'NoOp' }
    } else {
      return { _tag: 'NoOp' }
    }
  })

export const subscriptions = <A>(model: Model<A>): Sub<Msg<A>> => {
  const isGestureActive =
    model.gesture._tag === 'Pressed' || model.animate._tag === 'Dragging'
  return Sub.batch<Msg<A>>([
    isGestureActive ? gestureSubscriptions<A>() : Sub.none<Msg<A>>(),
    isOpen(model.animate)
      ? keyboardSubscriptions<A>(model.config)
      : Sub.none<Msg<A>>(),
  ])
}
