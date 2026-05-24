import React from 'react'
import { type Dispatcher } from 'tea-cup-fp'

import { examplesPage } from '@/common/type/route'
import { Link } from '@/component/link'
import { EditorComponent } from '@/editor/component'

import type { Model, Msg } from './type'
import { todoDecorations, todoSpec } from './update'

interface Props {
  model: Model
  dispatch: Dispatcher<Msg>
}

export const SpecFromScratchPage: React.FC<Props> = ({ model, dispatch }) => {
  return (
    <div>
      <Link route={{ page: examplesPage() }} className='back-link'>
        ← Back to Examples
      </Link>

      <h1 className='page-title'>Checklist Spec from Scratch 📋</h1>
      <p className='page-description'>
        This example shows how to write a custom specification completely from
        scratch. We define a custom <code>todo_list</code> element and
        interactive <code>todo_item</code> elements with checkbox toggles,
        complete with custom event interception to update the item's checked
        attribute.
      </p>

      <EditorComponent
        model={model.editor}
        spec={todoSpec}
        decorations={todoDecorations}
        dispatch={(msg) => dispatch({ _tag: 'EditorMsg', subMsg: msg })}
      />
    </div>
  )
}

export const SpecFromScratchPageMemo = React.memo(SpecFromScratchPage)
