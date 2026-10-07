import type * as Drawer from '@rinn7e/tea-cup-drawer'

// A right drawer (a page) with a bottom sheet shown inside it (`portal:
// Container`): the sheet keeps its own handle, at its top
export type Model = {
  page: Drawer.Model<null>
  sheet: Drawer.Model<null>
}

export type Msg =
  | { _tag: 'Open' }
  | { _tag: 'PageMsg'; subMsg: Drawer.Msg<null> }
  | { _tag: 'SheetMsg'; subMsg: Drawer.Msg<null> }
