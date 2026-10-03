import type * as Drawer from '@rinn7e/tea-cup-drawer'

// A persistent sheet like a chat composer: no overlay, page stays usable
export type Model = {
  drawer: Drawer.Model<null>
}

export type Msg =
  | { _tag: 'Open' }
  | { _tag: 'DrawerMsg'; subMsg: Drawer.Msg<null> }
