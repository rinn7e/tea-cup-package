import React from 'react'

import type { Props } from './type'

export const view = ({ model, dispatch }: Props) => {
  return (
    <div className='max-w-md mx-auto space-y-4'>
      <h1 className='text-2xl font-bold text-slate-800'>Sign Up</h1>
      <div className='space-y-3'>
        <label className='block text-xs font-medium text-slate-700'>
          Username
        </label>
        <input
          type='text'
          data-testid='signup-username'
          value={model.username}
          onChange={(e) =>
            dispatch({
              _tag: 'SetUsername',
              username: e.target.value,
            })
          }
          placeholder='your_name'
          className='w-full px-3 py-2 border border-slate-300 rounded-lg text-sm'
        />

        <button
          type='button'
          data-testid='btn-signup-submit'
          onClick={() => dispatch({ _tag: 'Submit' })}
          className='w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm'
        >
          Create Account
        </button>
      </div>
    </div>
  )
}
