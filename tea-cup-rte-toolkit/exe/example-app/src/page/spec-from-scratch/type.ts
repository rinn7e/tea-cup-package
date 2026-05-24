import { Option } from 'fp-ts/lib/Option'
import { Editor, State } from '@rinn7e/tea-cup-rte-toolkit'
import type * as EditorType from '@/editor/type'

export type Model = {
  editor: EditorType.Model
}

export type Msg =
  | { readonly _tag: 'EditorMsg'; readonly subMsg: EditorType.Msg }
  | { readonly _tag: 'ToggleCheckedTodoItem'; readonly path: Array<number>; readonly checked: boolean }
