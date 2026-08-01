import { State } from '@rinn7e/tea-cup-rte-toolkit'
import { Option } from 'fp-ts/lib/Option'

import type * as Editor from '@/component/editor/type'

export type InsertCaptionedImageModal = {
  visible: boolean
  editorState: Option<State>
  src: string
  alt: string
  caption: string
}

export type Model = {
  editor: Editor.Model
  insertCaptionedImageModal: InsertCaptionedImageModal
}

export type Msg =
  | { readonly _tag: 'EditorMsg'; readonly subMsg: Editor.Msg }
  | { readonly _tag: 'ShowUpdateCaptionedImageModel' }
  | { readonly _tag: 'UpdateCaptionedImageSrc'; readonly src: string }
  | { readonly _tag: 'UpdateCaptionedImageAlt'; readonly alt: string }
  | { readonly _tag: 'UpdateCaption'; readonly caption: string }
  | { readonly _tag: 'InsertCaptionedImage' }
  | { readonly _tag: 'CancelInsertCaptionedImage' }
  | {
      readonly _tag: 'CaptionedImage'
      readonly path: Array<number>
      readonly caption: string
    }
