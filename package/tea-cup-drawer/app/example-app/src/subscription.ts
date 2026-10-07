import { Sub } from 'tea-cup-fp'

import * as ActionsDrawer from './component/actions-drawer'
import * as BasicDrawer from './component/basic-drawer'
import * as DirectionDrawer from './component/direction-drawer'
import * as FeedbackDrawer from './component/feedback-drawer'
import * as HandleOnlyDrawer from './component/handle-only-drawer'
import * as MeasuredSnapDrawer from './component/measured-snap-drawer'
import * as NonDismissibleDrawer from './component/non-dismissible-drawer'
import * as NonModalDrawer from './component/non-modal-drawer'
import * as PayloadDrawer from './component/payload-drawer'
import * as ScrollDrawer from './component/scroll-drawer'
import * as ScrollXDrawer from './component/scroll-x-drawer'
import * as SkipAnimationDrawer from './component/skip-animation-drawer'
import * as SnapDrawer from './component/snap-drawer'
import * as SnapFullscreenDrawer from './component/snap-fullscreen-drawer'
import { type Model, type Msg } from './type'

export const subscriptions = (model: Model): Sub<Msg> =>
  Sub.batch([
    BasicDrawer.subscriptions(model.basicDrawer).map(
      (subMsg): Msg => ({ _tag: 'BasicDrawerMsg', subMsg }),
    ),
    NonDismissibleDrawer.subscriptions(model.nonDismissibleDrawer).map(
      (subMsg): Msg => ({ _tag: 'NonDismissibleDrawerMsg', subMsg }),
    ),
    SnapDrawer.subscriptions(model.snapDrawer).map(
      (subMsg): Msg => ({ _tag: 'SnapDrawerMsg', subMsg }),
    ),
    SnapFullscreenDrawer.subscriptions(model.snapFullscreenDrawer).map(
      (subMsg): Msg => ({ _tag: 'SnapFullscreenDrawerMsg', subMsg }),
    ),
    DirectionDrawer.subscriptions(model.topDrawer).map(
      (subMsg): Msg => ({ _tag: 'TopDrawerMsg', subMsg }),
    ),
    DirectionDrawer.subscriptions(model.leftDrawer).map(
      (subMsg): Msg => ({ _tag: 'LeftDrawerMsg', subMsg }),
    ),
    DirectionDrawer.subscriptions(model.rightDrawer).map(
      (subMsg): Msg => ({ _tag: 'RightDrawerMsg', subMsg }),
    ),
    ScrollDrawer.subscriptions(model.scrollDrawer).map(
      (subMsg): Msg => ({ _tag: 'ScrollDrawerMsg', subMsg }),
    ),
    ScrollXDrawer.subscriptions(model.scrollXDrawer).map(
      (subMsg): Msg => ({ _tag: 'ScrollXDrawerMsg', subMsg }),
    ),
    NonModalDrawer.subscriptions(model.nonModalDrawer).map(
      (subMsg): Msg => ({ _tag: 'NonModalDrawerMsg', subMsg }),
    ),
    PayloadDrawer.subscriptions(model.payloadDrawer).map(
      (subMsg): Msg => ({ _tag: 'PayloadDrawerMsg', subMsg }),
    ),
    HandleOnlyDrawer.subscriptions(model.handleOnlyDrawer).map(
      (subMsg): Msg => ({ _tag: 'HandleOnlyDrawerMsg', subMsg }),
    ),
    ActionsDrawer.subscriptions(model.actionsDrawer).map(
      (subMsg): Msg => ({ _tag: 'ActionsDrawerMsg', subMsg }),
    ),
    FeedbackDrawer.subscriptions(model.feedbackDrawer).map(
      (subMsg): Msg => ({ _tag: 'FeedbackDrawerMsg', subMsg }),
    ),
    MeasuredSnapDrawer.subscriptions(model.measuredSnapDrawer).map(
      (subMsg): Msg => ({ _tag: 'MeasuredSnapDrawerMsg', subMsg }),
    ),
    SkipAnimationDrawer.subscriptions(model.skipAnimationDrawer).map(
      (subMsg): Msg => ({ _tag: 'SkipAnimationDrawerMsg', subMsg }),
    ),
  ])
