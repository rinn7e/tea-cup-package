import type * as Drawer from '@rinn7e/tea-cup-drawer'

// A right drawer with content that scrolls sideways: a swipe on it scrolls
// it, and the drawer is dragged from the rest of its content
export type Model = {
  drawer: Drawer.Model<null>
}

export type Msg =
  | { _tag: 'Open' }
  | { _tag: 'DrawerMsg'; subMsg: Drawer.Msg<null> }
