import type * as Drawer from '@rinn7e/tea-cup-drawer'

// A drawer whose content can stop it from being dragged (`lockDrag`), e.g.
// while something inside it takes the gestures
export type Model = {
  drawer: Drawer.Model<null>
}

export type Msg =
  | { _tag: 'Open' }
  | { _tag: 'ToggleLock' }
  | { _tag: 'DrawerMsg'; subMsg: Drawer.Msg<null> }
