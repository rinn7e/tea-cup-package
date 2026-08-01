import { ProgramWithNav } from 'react-tea-cup'
import { type Dispatcher, Sub } from 'tea-cup-fp'

import { appView } from './app'
import type { Model, Msg } from './type'
import { preInit, preUpdate } from './update'

const preLoadingView = () => {
  return (
    <div className='initial-loader-wrap'>
      <div className='initial-loader'></div>
    </div>
  )
}

const preView = (dispatch: Dispatcher<Msg>, model: Model | null) => {
  return model ? appView({ model, dispatch }) : preLoadingView()
}

export const AppProgram = () => {
  return (
    <ProgramWithNav<Model | null, Msg>
      onUrlChange={(location) => ({ _tag: 'UrlChange', location })}
      init={preInit}
      update={preUpdate}
      view={preView}
      subscriptions={() => Sub.none()}
    />
  )
}
