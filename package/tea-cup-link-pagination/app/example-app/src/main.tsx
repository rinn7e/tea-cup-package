import * as LinkPagination from '@rinn7e/tea-cup-link-pagination'
import { devTools } from '@rinn7e/tea-cup-prelude'
import React, { useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { ProgramWithNav } from 'react-tea-cup'

import { App } from './app'
import './index.css'
import { type Model, type Msg } from './type'
import { init, subscriptions, update } from './update'

export function Main() {
  const refs = useRef(LinkPagination.mkRefs()).current

  return (
    <ProgramWithNav<Model, Msg>
      onUrlChange={(location) => ({
        _tag: 'TeaRouterMsg',
        subMsg: { _tag: 'UrlChange', location },
      })}
      init={(location: Location) => init(location, refs)}
      view={(dispatch, model) => <App model={model} dispatch={dispatch} />}
      update={update}
      subscriptions={subscriptions}
      flushSyncDefault={false}
      {...devTools<Model, Msg>().getProgramProps()}
    />
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>,
)
