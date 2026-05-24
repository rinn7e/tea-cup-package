import type * as Editor from '@/component/editor/type'

export type Model = {
  editor: Editor.Model
}

export type Msg = { readonly _tag: 'EditorMsg'; readonly subMsg: Editor.Msg }
