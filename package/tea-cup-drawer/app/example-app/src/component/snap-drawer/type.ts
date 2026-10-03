import type * as Drawer from '@rinn7e/tea-cup-drawer'

// Three resting positions, opens at 50%
export type Model = {
  drawer: Drawer.Model<null>
}

export type Msg =
  | { _tag: 'Open' }
  | { _tag: 'DrawerMsg'; subMsg: Drawer.Msg<null> }
