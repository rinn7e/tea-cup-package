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

import { type Model, type Msg } from './type'
import { isGestureActive } from './util'

export const documentEvents = new DocumentEvents()

const hasSelection = (): boolean => {
  const selection = window.getSelection()
  return selection !== null && selection.toString().length > 0
}

// Follow the pointer on the whole document while a gesture is in progress,
// so the drag continues when the pointer leaves the drawer.
const gestureSubscriptions = <Item>(): Sub<Msg<Item>> =>
  Sub.batch<Msg<Item>>([
    documentEvents.on(
      'pointermove',
      (e): Msg<Item> =>
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
      (e): Msg<Item> =>
        e.isPrimary
          ? { _tag: 'PointerUp', x: e.pageX, y: e.pageY, time: e.timeStamp }
          : { _tag: 'NoOp' },
    ),
    documentEvents.on(
      'pointercancel',
      (e): Msg<Item> =>
        e.isPrimary
          ? { _tag: 'PointerCancel', time: e.timeStamp }
          : { _tag: 'NoOp' },
    ),
    documentEvents.on(
      'contextmenu',
      (e): Msg<Item> => ({ _tag: 'PointerCancel', time: e.timeStamp }),
    ),
  ])

// Only the pointer gesture: the drawer has no keyboard listener. Keys
// (e.g. Escape) are the owner's to handle, by sending `Dismiss` or `Close`.
export const subscriptions = <Item>(model: Model<Item>): Sub<Msg<Item>> =>
  isGestureActive(model.animate)
    ? gestureSubscriptions<Item>()
    : Sub.none<Msg<Item>>()
