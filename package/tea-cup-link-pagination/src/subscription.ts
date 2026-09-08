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
import * as TeaObserver from '@rinn7e/tea-cup-intersection-observer'
import { Sub } from 'tea-cup-fp'

import { type Model, type Msg, nextButtonId, prevButtonId } from './type'

/**
 * Subscribes to IntersectionObserver events on the prev/next load-more trigger elements.
 * When either button scrolls into view, it fires `InViewPrev` or `InViewNext` respectively.
 * These messages should be handled by the parent to trigger `getMorePrevData` / `getMoreNextData`.
 *
 * @example
 * ```typescript
 * // In parent subscriptions:
 * LinkPagin.subscriptions(model.linkPagin).map(subMsg => ({ _tag: 'LinkPaginMsg', subMsg }))
 * ```
 */
export const subscriptions = <A, amsg, Route>(
  model: Model<A>,
): Sub<Msg<A, amsg, Route>> => {
  if (model.invisWhileScrolling) {
    return Sub.none()
  } else {
    const dataSourceId = model.mode.dataSourceId
    return Sub.batch([
      TeaObserver.watch(
        prevButtonId(dataSourceId),
        { threshold: 0 },
        (inView): Msg<A, amsg, Route> =>
          inView ? { _tag: 'GetMorePrevData' } : { _tag: 'NoOp' },
      ),
      TeaObserver.watch(
        nextButtonId(dataSourceId),
        { threshold: 0 },
        (inView): Msg<A, amsg, Route> =>
          inView ? { _tag: 'GetMoreNextData' } : { _tag: 'NoOp' },
      ),
    ])
  }
}
