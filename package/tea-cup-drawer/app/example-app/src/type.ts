import * as Drawer from '@rinn7e/tea-cup-drawer'

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
  // Open / close changes noticed by the parent, newest first
  openLog: string[]
}

export type Msg = {
  _tag: 'DrawerMsg'
  key: DemoKey
  subMsg: Drawer.Msg<string>
}
