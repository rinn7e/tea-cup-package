import React from 'react'

type Props = {
  count?: number
}

export const LoadingSkeleton: React.FC<Props> = ({ count = 6 }) => {
  return (
    <div
      data-test='loading-skeleton'
      className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={`skeleton-${idx}`}
          className='flex h-[270px] flex-col justify-between rounded-2xl border border-slate-200/60 bg-white p-5 shadow-xs animate-pulse'
        >
          <div>
            <div className='flex items-center justify-between mb-4'>
              <div className='h-5 w-20 rounded-full bg-slate-200' />
              <div className='h-8 w-8 rounded-full bg-slate-200' />
            </div>
            <div className='h-5 w-3/4 rounded-md bg-slate-200 mb-2' />
            <div className='h-3.5 w-1/3 rounded-md bg-slate-200 mb-4' />
            <div className='h-3.5 w-full rounded-md bg-slate-100 mb-2' />
            <div className='h-3.5 w-4/5 rounded-md bg-slate-100' />
          </div>
          <div className='mt-6 flex items-center justify-between border-t border-slate-100 pt-3'>
            <div className='h-6 w-16 rounded-md bg-slate-200' />
            <div className='h-7 w-20 rounded-xl bg-slate-200' />
          </div>
        </div>
      ))}
    </div>
  )
}
