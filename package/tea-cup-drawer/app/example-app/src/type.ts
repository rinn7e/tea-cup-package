import * as Drawer from '@rinn7e/tea-cup-drawer'
import * as EqClass from 'fp-ts/lib/Eq'
import * as S from 'fp-ts/lib/string'

import type * as ActionMenu from './component/action-menu'

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
