import * as Drawer from '@rinn7e/tea-cup-drawer'
import * as EqClass from 'fp-ts/lib/Eq'
import * as S from 'fp-ts/lib/string'

import type * as ActionMenu from './component/action-menu'
import type * as Feedback from './component/feedback'

// One drawer per scenario of the kitchen sink
export type DemoKey =
  | 'basic'
  | 'nonDismissible'
  | 'snap'
  | 'snapFullscreen'
  | 'top'
  | 'left'
  | 'right'
  | 'scroll'
  | 'nonModal'
  | 'payload'
  | 'handleOnly'

export const demoKeys: DemoKey[] = [
  'basic',
  'nonDismissible',
  'snap',
  'snapFullscreen',
  'top',
  'left',
  'right',
  'scroll',
  'nonModal',
  'payload',
  'handleOnly',
]

export type Model = {
  // The payload is the label the drawer was opened with
  drawers: Record<DemoKey, Drawer.Model<string>>
  // A TEA component (the action menu) living in the drawer payload
  actionsDrawer: Drawer.Model<ActionMenu.Model>
  // Owned by the parent, so it survives the drawer closing
  draft: string
  // Option A, side by side: the drawer carries no payload (`null`); the form
  // lives next to it, owned by the parent, and reaches it through `parent`
  feedbackDrawer: Drawer.Model<null>
  feedback: Feedback.Model
  // Clear the form once the drawer is fully closed, not on `Close` (the form
  // would empty while sliding away)
  clearFeedbackWhenClosed: boolean
  // Result of the (simulated) request, which arrives after the drawer closed
  lastFeedback: string | null
  // Open / close changes noticed by the parent, newest first
  openLog: string[]
}

// Parent state the actions drawer renders from (its `parent` channel)
export type ActionsParent = { draft: string }

export const ActionsParentEq: EqClass.Eq<ActionsParent> =
  EqClass.struct<ActionsParent>({ draft: S.Eq })

export type Msg =
  | { _tag: 'DrawerMsg'; key: DemoKey; subMsg: Drawer.Msg<string> }
  | { _tag: 'ActionsDrawerMsg'; subMsg: Drawer.Msg<ActionMenu.Model> }
  | { _tag: 'ActionMenuMsg'; subMsg: ActionMenu.Msg }
  | { _tag: 'SetDraft'; value: string }
  | { _tag: 'FeedbackDrawerMsg'; subMsg: Drawer.Msg<null> }
  | { _tag: 'FeedbackMsg'; subMsg: Feedback.Msg }
  | { _tag: 'FeedbackSent'; summary: string }
