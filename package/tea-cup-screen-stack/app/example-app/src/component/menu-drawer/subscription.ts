import * as Drawer from '@rinn7e/tea-cup-drawer'
import { type Sub } from 'tea-cup-fp'

import { type Model, type Msg } from './type'

export const subscriptions = (model: Model): Sub<Msg> =>
  Drawer.subscriptions(model.drawer).map(
    (subMsg): Msg => ({ _tag: 'DrawerMsg', subMsg }),
  )
