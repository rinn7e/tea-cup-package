import type * as Drawer from '@rinn7e/tea-cup-drawer'

// Slides from the top, left or right edge (`config.direction`)
export type Model = {
  drawer: Drawer.Model<null>
}

export type Msg =
  | { _tag: 'Open' }
  | { _tag: 'DrawerMsg'; subMsg: Drawer.Msg<null> }
