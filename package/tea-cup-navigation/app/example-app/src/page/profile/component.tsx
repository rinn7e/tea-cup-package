import React from 'react'

import type { Props } from './type'

export const view = ({ model, dispatch }: Props) => {
  return (
    <div className='space-y-4'>
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-2xl font-bold text-slate-800'>
            Profile: @{model.username}
          </h1>
          <span className='text-xs text-slate-500'>
            Mode: {model.favorites ? 'Favorited Articles' : 'My Articles'}
          </span>
        </div>

        <button
          type='button'
          data-testid='btn-profile-toggle-fav'
          onClick={() => dispatch({ _tag: 'ToggleFavorites' })}
          className='px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'
        >
          Toggle Favorites ({model.favorites ? 'On' : 'Off'})
        </button>
      </div>

      <div className='flex items-center gap-3'>
        <span>
          Profile Counter:{' '}
          <strong data-testid='profile-count'>{model.count}</strong>
        </span>
        <button
          type='button'
          data-testid='btn-profile-inc'
          onClick={() => dispatch({ _tag: 'Increment' })}
          className='px-2.5 py-1 text-xs bg-slate-200 hover:bg-slate-300 rounded font-medium'
        >
          +1
        </button>
      </div>
    </div>
  )
}
