import type * as Drawer from '@rinn7e/tea-cup-drawer'

import type * as Feedback from './sub-component/feedback'

export type Model = {
  // Option A, side by side: the drawer carries no payload (`null`); the form
  // lives next to it and reaches it through the `parent` channel
  drawer: Drawer.Model<null>
  feedback: Feedback.Model
  // Clear the form once the drawer is fully closed, not on `Close` (the form
  // would empty while sliding away)
  clearFeedbackWhenClosed: boolean
  // Result of the (simulated) request, which arrives after the drawer closed
  lastFeedback: string | null
}

export type Msg =
  | { _tag: 'Open' }
  // The form's messages arrive as the drawer's `ContentMsg` (sent with
  // `contentDispatch` from the content)
  | { _tag: 'DrawerMsg'; subMsg: Drawer.Msg<null, Feedback.Msg> }
  | { _tag: 'FeedbackSent'; summary: string }
