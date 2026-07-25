import { devTools } from '@rinn7e/tea-cup-prelude'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { Program } from 'react-tea-cup'

import { view } from './component'
import './index.css'
import { subscriptions } from './subscription'
import { Model, Msg } from './type'
import { init, update } from './update'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <Program
        init={init}
        update={update}
        view={view}
        subscriptions={subscriptions}
        {...devTools<Model, Msg>().getProgramProps()}
      />
    </React.StrictMode>,
  )
}
