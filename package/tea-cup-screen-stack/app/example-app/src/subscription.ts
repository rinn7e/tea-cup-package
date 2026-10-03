import { type Sub } from 'tea-cup-fp'

import * as MenuDrawer from './component/menu-drawer'
import { type Model, type Msg } from './type'

export const subscriptions = (model: Model): Sub<Msg> =>
  MenuDrawer.subscriptions(model.menuDrawer).map(
    (subMsg): Msg => ({ _tag: 'MenuDrawerMsg', subMsg }),
  )
