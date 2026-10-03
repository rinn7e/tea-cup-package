import type * as Drawer from '@rinn7e/tea-cup-drawer'

// Opened with a payload (a fruit), kept until the drawer has fully slid away
export type Model = {
  drawer: Drawer.Model<string>
}

export type Msg =
  | { _tag: 'Open'; fruit: string }
  | { _tag: 'DrawerMsg'; subMsg: Drawer.Msg<string> }
