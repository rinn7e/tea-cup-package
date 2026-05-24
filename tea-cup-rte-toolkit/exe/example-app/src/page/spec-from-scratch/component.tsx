import React from 'react'
import { type Dispatcher } from 'tea-cup-fp'

import { examplesPage } from '@/common/type/route'
import { editorComponentView } from '@/component/editor/component'
import { linkView } from '@/component/link'
import type { Msg as GlobalMsg } from '@/type'

import type { Model, Msg } from './type'
import { todoDecorations, todoSpec } from './update'

interface Props {
  model: Model
  dispatch: Dispatcher<Msg>
  setGlobalMsg: Dispatcher<GlobalMsg>
}

export const specFromScratchPageView = ({
  model,
  dispatch,
  setGlobalMsg,
}: Props): React.ReactElement => {
  return (
    <div>
      {linkView({
        route: { page: examplesPage() },
        className: 'back-link',
        setGlobalMsg,
        children: '← Back to Examples',
      })}

      <h1 className='page-title'>Checklist Spec from Scratch 📋</h1>
      <p className='page-description'>
        This example shows how to write a custom specification completely from
        scratch. We define a custom <code>todo_list</code> element and
        interactive <code>todo_item</code> elements with checkbox toggles,
        complete with custom event interception to update the item's checked
        attribute.
      </p>

      {editorComponentView({
        model: model.editor,
        spec: todoSpec,
        decorations: todoDecorations,
        dispatch: (msg) => dispatch({ _tag: 'EditorMsg', subMsg: msg }),
      })}
    </div>
  )
}
