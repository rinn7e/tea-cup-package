import { Sub } from 'tea-cup-fp'
import * as TeaObserver from '@rinn7e/tea-cup-intersection-observer'
import { type Model, type Msg } from './type'

export const subscriptions = (model: Model): Sub<Msg> => {
  return Sub.batch(
    model.items.map((item, index) =>
      TeaObserver.watch(
        item.id,
        { threshold: 0.5 },
        (inView): Msg => ({
          _tag: 'SetInView',
          index,
          inView,
        }),
      ),
    ),
  )
}
