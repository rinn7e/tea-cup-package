import React from 'react'

import type { Props } from './type'

export const view = ({ model, dispatch }: Props) => {
  return (
    <div className='space-y-4'>
      <h1 className='text-2xl font-bold text-slate-800'>
        Article: {model.slug}
      </h1>
      <div className='flex items-center gap-3'>
        <span>
          Comments Count:{' '}
          <strong data-testid='article-comments-count'>
            {model.commentsCount}
          </strong>
        </span>
        <button
          type='button'
          data-testid='btn-article-add-comment'
          onClick={() => dispatch({ _tag: 'AddComment' })}
          className='px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700'
        >
          Add Comment
        </button>
      </div>
    </div>
  )
}
