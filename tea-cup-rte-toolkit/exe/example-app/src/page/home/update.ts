import { Cmd } from 'tea-cup-fp'
import {
  block,
  element,
  doc,
  paragraph,
  code,
  plainText,
  markedText,
  mark,
  createState,
  editor as createEditor,
  blockChildren,
  inlineChildren,
  markdown,
} from '@rinn7e/tea-cup-rte-toolkit'
import * as O from 'fp-ts/lib/Option'

import * as EditorUpdate from '@/editor/update'
import type { Model, Msg } from './type'

const initNode = block(
  element(doc, []),
  blockChildren([
    block(
      element(paragraph, []),
      inlineChildren([
        plainText(
          'Rich Text Editor Toolkit is an open source project to make cross platform editors on the web. ' +
            'This package treats '
        ),
        markedText('contenteditable', [mark(code, [])]),
        plainText(
          ' as an I/O device, and uses browser events and mutation observers ' +
            'to detect changes and update itself. The editor\'s model is defined ' +
            'and validated by a programmable specification that allows you to create a ' +
            'custom tailored editor that fits your needs.'
        ),
      ])
    ),
  ])
)

const initialState = createState(initNode, O.none)

export const init = (): [Model, Cmd<Msg>] => {
  const [editorModel, editorCmd] = [
    EditorUpdate.init(createEditor(initialState)),
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
        model.editor
      )
      return [
        { ...model, editor: editorModel },
        editorCmd.map((subMsg) => ({ _tag: 'EditorMsg', subMsg })),
      ]
    }
  }
}
