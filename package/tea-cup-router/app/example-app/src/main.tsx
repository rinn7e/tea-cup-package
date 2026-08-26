import { devTools } from '@rinn7e/tea-cup-prelude'
import * as TeaRouter from '@rinn7e/tea-cup-router'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { ProgramWithNav } from 'react-tea-cup'
import { Sub } from 'tea-cup-fp'

import { App } from './app'
import './index.css'
import { type Model, type Msg, TeaRouterMsg } from './type'
import { init, update } from './update'

const root = document.getElementById('app')
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <ProgramWithNav<Model, Msg>
        onUrlChange={(location) =>
          TeaRouterMsg(TeaRouter.UrlChangeMsg(location))
        }
        init={(location) => init(location)}
        update={update}
        view={(dispatch, model) => <App model={model} dispatch={dispatch} />}
        subscriptions={() => Sub.none()}
        {...devTools<Model, Msg>().getProgramProps()}
      />
    </React.StrictMode>,
  )
}
