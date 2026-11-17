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
import { Sub } from 'tea-cup-fp'

import { type LogicConfig, type Model, type Msg } from './type'

/**
 * Subscribes to the subscriptions of every loaded item
 * (`LogicConfig.subscriptions`). The items keep their subscriptions while
 * scrolling. (The older and newer pages load when the scroll container shows
 * its header or footer: its `EdgeShown`, see `loadAtEdgeHandler`.)
 *
 * @example
 * ```typescript
 * // In parent subscriptions:
 * LinkPagin.subscriptions(model.linkPagin, logicConfig).map(subMsg => ({ _tag: 'LinkPaginMsg', subMsg }))
 * ```
 */
export const subscriptions = <Item, ItemMsg, Route, Parent>(
  model: Model<Item>,
  logic: LogicConfig<Item, Parent, ItemMsg>,
): Sub<Msg<Item, ItemMsg, Route>> => {
  const itemSubs = model.mode.overallData.value.map((item) =>
    logic.subscriptions(item).map(
      (subMsg): Msg<Item, ItemMsg, Route> => ({
        _tag: 'ChildMsg',
        childId: logic.uniqueKeyField(item),
        subMsg,
      }),
    ),
  )
  return Sub.batch(itemSubs)
}
