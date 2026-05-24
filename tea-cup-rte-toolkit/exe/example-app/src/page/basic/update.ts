import {
  editor as createEditor,
  createState,
  markdown,
} from '@rinn7e/tea-cup-rte-toolkit'
import * as O from 'fp-ts/lib/Option'
import { Cmd } from 'tea-cup-fp'

import * as EditorUpdate from '@/editor/update'

import type { Model, Msg } from './type'

export const init = (): [Model, Cmd<Msg>] => {
  const [editorModel, editorCmd] = [
    EditorUpdate.init(
      createEditor(createState(EditorUpdate.docInitNode(), O.none)),
    ),
    Cmd.none<EditorUpdate.Msg>(),
  ]
  return [
    { editor: editorModel },
    editorCmd.map((msg) => ({ _tag: 'EditorMsg', subMsg: msg })),
  ]
}

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'EditorMsg': {
      const [editorModel, editorCmd] = EditorUpdate.update(
        markdown,
        msg.subMsg,
        model.editor,
      )
      return [
        { ...model, editor: editorModel },
        editorCmd.map((subMsg) => ({ _tag: 'EditorMsg', subMsg })),
      ]
    }
  }
}
