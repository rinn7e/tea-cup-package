import React from 'react'

import type { Props } from './type'

export const view = ({ model, dispatch }: Props) => {
  return (
    <div className='max-w-md mx-auto space-y-4'>
      <h1 className='text-2xl font-bold text-slate-800'>
        Settings (Protected)
      </h1>
      <div className='space-y-3'>
        <label className='block text-xs font-medium text-slate-700'>
          User Bio
        </label>
        <textarea
          data-testid='settings-bio'
          value={model.bio}
          onChange={(e) => dispatch({ _tag: 'SetBio', bio: e.target.value })}
          rows={3}
          className='w-full px-3 py-2 border border-slate-300 rounded-lg text-sm'
        />

        <button
          type='button'
          data-testid='btn-settings-logout'
          onClick={() => dispatch({ _tag: 'Logout' })}
          className='w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-sm'
        >
          Logout & Redirect Home
        </button>
      </div>
    </div>
  )
}
