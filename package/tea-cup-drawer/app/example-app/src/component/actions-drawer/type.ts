import type * as Drawer from '@rinn7e/tea-cup-drawer'
import * as EqClass from 'fp-ts/lib/Eq'
import * as S from 'fp-ts/lib/string'

import type * as ActionMenu from './sub-component/action-menu'

export type Model = {
  // A TEA component (the action menu) living in the drawer payload: reset on
  // every open, dropped once the drawer has closed
  drawer: Drawer.Model<ActionMenu.Model>
  // Owned here, outside the payload, so it survives the drawer closing
  draft: string
}

// State the drawer content renders from besides its payload (its `parent`
// channel)
export type ActionsParent = { draft: string }

export const ActionsParentEq: EqClass.Eq<ActionsParent> =
  EqClass.struct<ActionsParent>({ draft: S.Eq })

// Messages of the drawer content, sent with `contentDispatch` (the drawer's
// `ContentMsg`, keyed by the menu's `messageId`)
export type ActionsContentMsg =
  | { _tag: 'ActionMenuMsg'; subMsg: ActionMenu.Msg }
  | { _tag: 'SetDraft'; value: string }

export type Msg =
  // Open the menu for a message
  | { _tag: 'Open'; messageId: string }
  | {
      _tag: 'DrawerMsg'
      subMsg: Drawer.Msg<ActionMenu.Model, ActionsContentMsg>
    }
