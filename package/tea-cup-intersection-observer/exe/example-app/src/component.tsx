import * as React from 'react'
import { type Dispatcher } from 'tea-cup-fp'

import { type Model, type Msg } from './type'

export const view = (dispatch: Dispatcher<Msg>, model: Model) => {
  const inViewCount = model.items.filter((item) => item.inView).length

  return (
    <div className='min-h-screen bg-slate-950 px-6 py-12 text-slate-100 selection:bg-blue-500/30 selection:text-blue-200'>
      <div className='mx-auto max-w-6xl'>
        {/* Header */}
        <div className='mb-10 text-center'>
          <h1 className='bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-5xl'>
            TeaCup Intersection Observer
          </h1>
          <p className='mx-auto mt-3 max-w-xl text-lg text-slate-400'>
            A premium, Elm-structured Intersection Observer subscription for
            React Tea-Cup applications.
          </p>
        </div>

        {/* Stats Dashboard */}
        <div className='mb-8 grid grid-cols-2 gap-4 md:grid-cols-4'>
          <div className='rounded-2xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-md'>
            <div className='text-xs font-semibold tracking-wider text-slate-500 uppercase'>
              Total Items
            </div>
            <div className='mt-2 text-3xl font-bold text-slate-200'>
              {model.items.length}
            </div>
          </div>
          <div className='rounded-2xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-md'>
            <div className='text-xs font-semibold tracking-wider text-slate-500 uppercase'>
              Currently In View
            </div>
            <div className='mt-2 flex items-center gap-2 text-3xl font-bold text-blue-400'>
              {inViewCount}
              <span className='relative flex h-3 w-3'>
                <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75'></span>
                <span className='relative inline-flex h-3 w-3 rounded-full bg-blue-500'></span>
              </span>
            </div>
          </div>
          <div className='rounded-2xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-md'>
            <div className='text-xs font-semibold tracking-wider text-slate-500 uppercase'>
              Top Reached
            </div>
            <div className='mt-2 text-3xl font-bold text-indigo-400'>
              {model.topReachedCount}
            </div>
          </div>
          <div className='rounded-2xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-md'>
            <div className='text-xs font-semibold tracking-wider text-slate-500 uppercase'>
              Bottom Reached
            </div>
            <div className='mt-2 text-3xl font-bold text-emerald-400'>
              {model.bottomReachedCount}
            </div>
          </div>
        </div>

        {/* Main Work Area */}
        <div className='grid grid-cols-1 gap-8 lg:grid-cols-3'>
          {/* Scroll container (Left 2 cols) */}
          <div className='flex flex-col gap-4 lg:col-span-2'>
            <div className='flex items-center justify-between border-b border-slate-800 pb-3'>
              <h2 className='text-lg font-bold text-slate-300'>
                Observed Scroll Feed
              </h2>
              <span className='text-xs text-slate-500'>
                Threshold: 50% visible
              </span>
            </div>

            <div className='custom-scrollbar flex h-[600px] flex-col gap-4 overflow-y-auto rounded-2xl border border-slate-800/80 bg-slate-900/20 p-4 backdrop-blur-sm'>
              {model.items.map((item, index) => (
                <div
                  key={item.id}
                  id={item.id}
                  style={{
                    height: `${item.height}px`,
                  }}
                  className={`flex flex-col items-center justify-center rounded-xl border transition-all duration-300 ${
                    item.inView
                      ? 'scale-[1.01] border-blue-500/40 bg-blue-600/10 text-blue-200 shadow-lg shadow-blue-500/5'
                      : 'border-slate-800/80 bg-slate-900/40 text-slate-400'
                  }`}
                >
                  <span className='text-sm font-semibold tracking-wide'>
                    Item {index}
                  </span>
                  <span className='mt-1 font-mono text-xs text-slate-500'>
                    height: {item.height}px • {item.inView ? 'Active' : 'Idle'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Status Panel (Right 1 col) */}
          <div className='flex flex-col gap-4'>
            <div className='flex items-center justify-between border-b border-slate-800 pb-3'>
              <h2 className='text-lg font-bold text-slate-300'>
                Real-time Monitor
              </h2>
              <span className='font-mono text-xs text-slate-500'>Status</span>
            </div>

            <div className='flex h-[600px] flex-1 flex-col gap-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 p-5 backdrop-blur-md'>
              <div className='text-xs font-bold tracking-wider text-slate-400 uppercase'>
                Virtual Map View
              </div>

              {/* Grid of indicators */}
              <div className='custom-scrollbar grid max-h-[480px] grid-cols-5 gap-2 overflow-y-auto pr-1'>
                {model.items.map((item, index) => (
                  <div
                    key={`indicator-${item.id}`}
                    className={`flex flex-col items-center justify-center rounded-lg border p-2 transition-all duration-200 ${
                      item.inView
                        ? 'border-blue-500/40 bg-blue-500/20 font-bold text-blue-300'
                        : 'border-slate-900 bg-slate-900/30 text-slate-600'
                    }`}
                  >
                    <span className='font-mono text-[10px]'>{index}</span>
                    <span
                      className={`mt-1 h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                        item.inView
                          ? 'bg-blue-400 shadow-md shadow-blue-400'
                          : 'bg-slate-800'
                      }`}
                    />
                  </div>
                ))}
              </div>

              {/* Console log outputs */}
              <div className='mt-auto border-t border-slate-800 pt-4'>
                <div className='mb-2 flex items-center justify-between'>
                  <span className='text-[10px] font-bold tracking-wider text-slate-500 uppercase'>
                    Console Feedback
                  </span>
                  <div className='flex gap-1'>
                    <span className='h-1.5 w-1.5 rounded-full bg-slate-700' />
                    <span className='h-1.5 w-1.5 rounded-full bg-slate-700' />
                    <span className='h-1.5 w-1.5 rounded-full bg-slate-700' />
                  </div>
                </div>
                <div className='rounded-lg border border-slate-800/60 bg-slate-900/80 p-3 font-mono text-[11px] leading-relaxed text-emerald-400'>
                  {model.topReachedCount > 0 && (
                    <div className='animate-pulse'>
                      🍵 Top reached! ({model.topReachedCount})
                    </div>
                  )}
                  {model.bottomReachedCount > 0 && (
                    <div className='animate-pulse'>
                      🍵 Bottom reached! ({model.bottomReachedCount})
                    </div>
                  )}
                  {model.topReachedCount === 0 &&
                    model.bottomReachedCount === 0 && (
                      <div className='text-slate-500 italic'>
                        Scroll feed to trigger events...
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
