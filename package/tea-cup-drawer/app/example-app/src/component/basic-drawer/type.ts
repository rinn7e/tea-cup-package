import type * as Drawer from '@rinn7e/tea-cup-drawer'

// A bottom sheet with an overlay
export type Model = {
  drawer: Drawer.Model<null>
}

export type Msg =
  | { _tag: 'Open' }
  | { _tag: 'DrawerMsg'; subMsg: Drawer.Msg<null> }
