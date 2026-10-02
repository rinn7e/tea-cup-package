import * as Drawer from '@rinn7e/tea-cup-drawer'
import { Sub } from 'tea-cup-fp'

import { type Model, type Msg, demoKeys } from './type'

export const subscriptions = (model: Model): Sub<Msg> =>
  Sub.batch([
    ...demoKeys.map((key) =>
      Drawer.subscriptions(model.drawers[key]).map(
        (subMsg): Msg => ({ _tag: 'DrawerMsg', key, subMsg }),
      ),
    ),
    Drawer.subscriptions(model.actionsDrawer).map(
      (subMsg): Msg => ({ _tag: 'ActionsDrawerMsg', subMsg }),
    ),
    Drawer.subscriptions(model.feedbackDrawer).map(
      (subMsg): Msg => ({ _tag: 'FeedbackDrawerMsg', subMsg }),
    ),
  ])
