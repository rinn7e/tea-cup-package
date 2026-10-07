import type * as Drawer from '@rinn7e/tea-cup-drawer'

// A page from the right, like a screen pushed in a native app, that can be
// shown at once instead of sliding in (e.g. a page an app restores on load)
export type Model = {
  drawer: Drawer.Model<null>
}

export type Msg =
  // Slides in, as for anything the user does
  | { _tag: 'Open' }
  // Shown at once (`skipAnimation`)
  | { _tag: 'OpenAtOnce' }
  | { _tag: 'DrawerMsg'; subMsg: Drawer.Msg<null> }
