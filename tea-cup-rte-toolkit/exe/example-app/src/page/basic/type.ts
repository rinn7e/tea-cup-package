import type * as Editor from '@/editor/type'

export type Model = {
  editor: Editor.Model
}

export type Msg =
  | { readonly _tag: 'EditorMsg'; readonly subMsg: Editor.Msg }
