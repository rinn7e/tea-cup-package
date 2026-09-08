// SPDX-FileCopyrightText: 2023 Rinn7e <https://rinn7e.io>
//
// SPDX-License-Identifier: MIT
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
