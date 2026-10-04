import type * as Drawer from '@rinn7e/tea-cup-drawer'
import * as EqClass from 'fp-ts/lib/Eq'
import * as N from 'fp-ts/lib/number'

// The payload: a summary whose height is the drawer's compact snap point,
// like a chat composer that grows with its text
export type Summary = { lines: number }

export const SummaryEq: EqClass.Eq<Summary> = EqClass.struct<Summary>({
  lines: N.Eq,
})

// Messages of the drawer content, sent with `contentDispatch`
export type MeasuredContentMsg =
  | { _tag: 'AddLine' }
  | { _tag: 'RemoveLine' }
  // Height (px) of the part shown at the compact snap point, measured by
  // the content whenever it changes
  | { _tag: 'Measured'; px: number }

export type Model = {
  drawer: Drawer.Model<Summary>
}

export type Msg =
  | { _tag: 'Open' }
  | { _tag: 'DrawerMsg'; subMsg: Drawer.Msg<Summary, MeasuredContentMsg> }

// The drawer's title, which names it
export const titleId = 'drawer-title-measuredSnap'
