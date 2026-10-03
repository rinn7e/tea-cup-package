import type * as Drawer from '@rinn7e/tea-cup-drawer'

// Starts as a short sheet (overlay included) and can be dragged up to full screen
export type Model = {
  drawer: Drawer.Model<null>
}

export type Msg =
  | { _tag: 'Open' }
  | { _tag: 'DrawerMsg'; subMsg: Drawer.Msg<null> }
