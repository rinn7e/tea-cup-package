import React from 'react'

import type { Props } from './type'

export const view = ({ model, dispatch }: Props) => {
  return (
    <div className='max-w-md mx-auto space-y-4'>
      <h1 className='text-2xl font-bold text-slate-800'>
        {model.slug ? `Edit Article (${model.slug})` : 'New Article'}
      </h1>
      <div className='space-y-3'>
        <input
          type='text'
          data-testid='editor-title'
          value={model.title}
          onChange={(e) =>
            dispatch({ _tag: 'SetTitle', title: e.target.value })
          }
          placeholder='Article Title'
          className='w-full px-3 py-2 border border-slate-300 rounded-lg text-sm'
        />
        <button
          type='button'
          data-testid='btn-editor-submit'
          onClick={() => dispatch({ _tag: 'Submit' })}
          className='w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm'
        >
          Publish Article
        </button>
      </div>
    </div>
  )
}
