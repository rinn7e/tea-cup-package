import * as Drawer from '@rinn7e/tea-cup-drawer'
import { Sub } from 'tea-cup-fp'

import { type Model, type Msg } from './type'

export const subscriptions = (model: Model): Sub<Msg> =>
  Sub.batch([
    Drawer.subscriptions(model.page).map(
      (subMsg): Msg => ({ _tag: 'PageMsg', subMsg }),
    ),
    Drawer.subscriptions(model.sheet).map(
      (subMsg): Msg => ({ _tag: 'SheetMsg', subMsg }),
    ),
  ])
