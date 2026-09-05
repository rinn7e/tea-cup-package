import * as TeaObserver from '@rinn7e/tea-cup-intersection-observer'
import { Sub } from 'tea-cup-fp'

import { type Model, type Msg, nextButtonId, prevButtonId } from './type'

/**
 * Subscribes to IntersectionObserver events on the prev/next load-more trigger elements.
 * When either button scrolls into view, it fires `GetMorePrevData` or `GetMoreNextData`.
 *
 * @example
 * ```typescript
 * // In parent subscriptions:
 * LinkPagination.subscriptions(model.linkPagin).map(subMsg => ({ _tag: 'LinkPaginMsg', subMsg }))
 * ```
 */
export const subscriptions = <A, ItemMsg>(
  model: Model<A>,
): Sub<Msg<A, ItemMsg>> => {
  if (model.invisWhileScrolling) {
    return Sub.none()
  }
  const dataSourceId = model.mode.dataSourceId
  return Sub.batch([
    TeaObserver.watch(
      prevButtonId(dataSourceId),
      { threshold: 0 },
      (inView): Msg<A, ItemMsg> =>
        inView
          ? { _tag: 'GetMorePrevData', dataSourceId, networkStatus: true }
          : { _tag: 'NoOp' },
    ),
    TeaObserver.watch(
      nextButtonId(dataSourceId),
      { threshold: 0 },
      (inView): Msg<A, ItemMsg> =>
        inView
          ? { _tag: 'GetMoreNextData', dataSourceId, networkStatus: true }
          : { _tag: 'NoOp' },
    ),
  ])
}
