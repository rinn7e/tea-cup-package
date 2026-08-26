import React from 'react'

import type { Props } from './type'

export const view = (_props: Props) => {
  return (
    <div data-testid='not-found-view' className='text-center py-12 space-y-3'>
      <h1 className='text-4xl font-extrabold text-slate-400'>404</h1>
      <p className='text-slate-600 font-medium'>Page Not Found</p>
    </div>
  )
}
