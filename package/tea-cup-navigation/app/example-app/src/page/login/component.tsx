import React from 'react'

import type { Props } from './type'

export const view = ({ model, dispatch }: Props) => {
  return (
    <div className='max-w-md mx-auto space-y-4'>
      <h1 className='text-2xl font-bold text-slate-800'>Sign In</h1>
      <p className='text-xs text-slate-500'>
        Route guard redirects authenticated users away from this page!
      </p>

      <div className='space-y-3'>
        <label className='block text-xs font-medium text-slate-700'>
          Email Address
        </label>
        <input
          type='email'
          data-testid='login-email'
          value={model.email}
          onChange={(e) =>
            dispatch({ _tag: 'SetEmail', email: e.target.value })
          }
          placeholder='user@example.com'
          className='w-full px-3 py-2 border border-slate-300 rounded-lg text-sm'
        />

        <button
          type='button'
          data-testid='btn-login-submit'
          onClick={() => dispatch({ _tag: 'Submit' })}
          className='w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm'
        >
          Sign In & Redirect
        </button>
      </div>
    </div>
  )
}
