import { AlertTriangle, RefreshCw } from 'lucide-react'
import React from 'react'

type Props = {
  message: string
  onRetry: () => void
}

export const ErrorView: React.FC<Props> = ({ message, onRetry }) => {
  return (
    <div
      data-test='error-view'
      className='flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/50 p-8 text-center'
    >
      <div className='flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-3'>
        <AlertTriangle className='h-6 w-6' />
      </div>
      <h3 className='text-base font-bold text-rose-900'>
        Failed to load products
      </h3>
      <p className='mt-1 max-w-md text-xs text-rose-600 font-medium'>
        {message}
      </p>
      <button
        type='button'
        data-test='retry-btn'
        onClick={onRetry}
        className='mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-rose-700'
      >
        <RefreshCw className='h-3.5 w-3.5' />
        Retry Request
      </button>
    </div>
  )
}
