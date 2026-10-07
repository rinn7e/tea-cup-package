import type * as ActionsDrawer from './component/actions-drawer'
import type * as BasicDrawer from './component/basic-drawer'
import type * as DirectionDrawer from './component/direction-drawer'
import type * as FeedbackDrawer from './component/feedback-drawer'
import type * as HandleOnlyDrawer from './component/handle-only-drawer'
import type * as MeasuredSnapDrawer from './component/measured-snap-drawer'
import type * as NonDismissibleDrawer from './component/non-dismissible-drawer'
import type * as NonModalDrawer from './component/non-modal-drawer'
import type * as PayloadDrawer from './component/payload-drawer'
import type * as ScrollDrawer from './component/scroll-drawer'
import type * as ScrollXDrawer from './component/scroll-x-drawer'
import type * as SkipAnimationDrawer from './component/skip-animation-drawer'
import type * as SnapDrawer from './component/snap-drawer'
import type * as SnapFullscreenDrawer from './component/snap-fullscreen-drawer'

// One child component per demo drawer
export type Model = {
  basicDrawer: BasicDrawer.Model
  nonDismissibleDrawer: NonDismissibleDrawer.Model
  snapDrawer: SnapDrawer.Model
  snapFullscreenDrawer: SnapFullscreenDrawer.Model
  // The same component, opened from three edges
  topDrawer: DirectionDrawer.Model
  leftDrawer: DirectionDrawer.Model
  rightDrawer: DirectionDrawer.Model
  scrollDrawer: ScrollDrawer.Model
  // Content that scrolls sideways, in a right drawer
  scrollXDrawer: ScrollXDrawer.Model
  nonModalDrawer: NonModalDrawer.Model
  payloadDrawer: PayloadDrawer.Model
  handleOnlyDrawer: HandleOnlyDrawer.Model
  // A TEA menu in the payload, and a draft that survives closing
  actionsDrawer: ActionsDrawer.Model
  // Side by side: a form next to a drawer without payload
  feedbackDrawer: FeedbackDrawer.Model
  // A snap point measured from the content
  measuredSnapDrawer: MeasuredSnapDrawer.Model
  // Shown at once, without sliding in
  skipAnimationDrawer: SkipAnimationDrawer.Model
  // Open / close changes the parent noticed in its children (vaul's
  // `onOpenChange`), newest first
  openLog: string[]
}

export type Msg =
  | { _tag: 'BasicDrawerMsg'; subMsg: BasicDrawer.Msg }
  | { _tag: 'NonDismissibleDrawerMsg'; subMsg: NonDismissibleDrawer.Msg }
  | { _tag: 'SnapDrawerMsg'; subMsg: SnapDrawer.Msg }
  | { _tag: 'SnapFullscreenDrawerMsg'; subMsg: SnapFullscreenDrawer.Msg }
  | { _tag: 'TopDrawerMsg'; subMsg: DirectionDrawer.Msg }
  | { _tag: 'LeftDrawerMsg'; subMsg: DirectionDrawer.Msg }
  | { _tag: 'RightDrawerMsg'; subMsg: DirectionDrawer.Msg }
  | { _tag: 'ScrollDrawerMsg'; subMsg: ScrollDrawer.Msg }
  | { _tag: 'ScrollXDrawerMsg'; subMsg: ScrollXDrawer.Msg }
  | { _tag: 'NonModalDrawerMsg'; subMsg: NonModalDrawer.Msg }
  | { _tag: 'PayloadDrawerMsg'; subMsg: PayloadDrawer.Msg }
  | { _tag: 'HandleOnlyDrawerMsg'; subMsg: HandleOnlyDrawer.Msg }
  | { _tag: 'ActionsDrawerMsg'; subMsg: ActionsDrawer.Msg }
  | { _tag: 'FeedbackDrawerMsg'; subMsg: FeedbackDrawer.Msg }
  | { _tag: 'MeasuredSnapDrawerMsg'; subMsg: MeasuredSnapDrawer.Msg }
  | { _tag: 'SkipAnimationDrawerMsg'; subMsg: SkipAnimationDrawer.Msg }
