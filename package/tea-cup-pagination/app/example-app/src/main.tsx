import { devTools } from '@rinn7e/tea-cup-prelude'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { Program } from 'react-tea-cup'
import { Sub } from 'tea-cup-fp'

import { App } from './app'
import './index.css'
import { type Model, type Msg } from './type'
import { init, update } from './update'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <Program<Model, Msg>
        init={init}
        update={update}
        view={(dispatch, model) => <App model={model} dispatch={dispatch} />}
        subscriptions={() => Sub.none()}
        {...devTools<Model, Msg>().getProgramProps()}
      />
    </React.StrictMode>,
  )
}
