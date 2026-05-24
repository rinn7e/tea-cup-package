import { markdown } from '@rinn7e/tea-cup-rte-toolkit'
import React from 'react'
import { type Dispatcher } from 'tea-cup-fp'

import { examplesPage } from '@/common/type/route'
import { editorComponentView } from '@/component/editor/component'
import { linkView } from '@/component/link'
import type { Msg as GlobalMsg } from '@/type'

import type { Model, Msg } from './type'

interface Props {
  model: Model
  dispatch: Dispatcher<Msg>
  setGlobalMsg: Dispatcher<GlobalMsg>
}

export const basicPageView = ({
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

      <h1 className='page-title'>Basic Example ✍️</h1>
      <p className='page-description'>
        You can use this package to create all sorts of editors. Trying to write
        one from scratch can be a little overwhelming though, so the package
        provides a default spec and default commands as a jumping off point for
        your own editor. In this example, we use the default spec to create an
        editor which supports things like headers, lists, as well as links and
        images.
      </p>

      {editorComponentView({
        model: model.editor,
        spec: markdown,
        dispatch: (msg) => dispatch({ _tag: 'EditorMsg', subMsg: msg }),
      })}
    </div>
  )
}
