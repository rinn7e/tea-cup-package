import { Compass, Home } from 'lucide-react'
import { type JSX, memo, useContext } from 'react'

import { SetGlobalMsgContext } from '../../common/global-context'
import { redirectToHomepage } from '../../common/util/route'

export const NotFoundPageComponent = (): JSX.Element => {
  const setGlobalMsg = useContext(SetGlobalMsgContext)

  return (
    <div
      data-testid='not-found-page'
      data-component='NotFoundPageComponent'
      className='flex size-full flex-col items-center justify-center bg-slate-50 p-6 text-center select-none'
    >
      <div className='flex size-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner'>
        <Compass className='size-8 animate-pulse' />
      </div>

      <h1 className='mt-4 text-2xl font-black text-slate-800'>404 Not Found</h1>
      <p className='mt-1 max-w-sm text-sm text-slate-500'>
        The room or page you are looking for does not exist or has been moved.
      </p>

      <button
        type='button'
        data-testid='not-found-home-btn'
        onClick={() => redirectToHomepage(setGlobalMsg)}
        className='mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-transform hover:scale-105 hover:bg-indigo-700'
      >
        <Home className='size-4' />
        <span>Back to Home</span>
      </button>
    </div>
  )
}

export const NotFoundPage = memo(NotFoundPageComponent)
