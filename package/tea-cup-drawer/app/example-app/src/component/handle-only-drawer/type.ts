import type * as Drawer from '@rinn7e/tea-cup-drawer'

// Only the handle starts a drag
export type Model = {
  drawer: Drawer.Model<null>
}

export type Msg =
  | { _tag: 'Open' }
  | { _tag: 'DrawerMsg'; subMsg: Drawer.Msg<null> }
