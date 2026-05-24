import { type Dispatcher } from 'tea-cup-fp'
import * as React from 'react'

import { type Model, type Msg } from './type'

export const view = (dispatch: Dispatcher<Msg>, model: Model) => {
  const inViewCount = model.items.filter((item) => item.inView).length

  return (
    <div className='min-h-screen bg-slate-950 px-6 py-12 text-slate-100 selection:bg-blue-500/30 selection:text-blue-200'>
      <div className='mx-auto max-w-6xl'>
        {/* Header */}
        <div className='mb-10 text-center'>
          <h1 className='text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent sm:text-5xl'>
            TeaCup Intersection Observer
          </h1>
          <p className='mt-3 text-lg text-slate-400 max-w-xl mx-auto'>
            A premium, Elm-structured Intersection Observer subscription for React Tea-Cup applications.
          </p>
        </div>

        {/* Stats Dashboard */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
          <div className='rounded-2xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-md'>
            <div className='text-xs font-semibold tracking-wider text-slate-500 uppercase'>Total Items</div>
            <div className='mt-2 text-3xl font-bold text-slate-200'>{model.items.length}</div>
          </div>
          <div className='rounded-2xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-md'>
            <div className='text-xs font-semibold tracking-wider text-slate-500 uppercase'>Currently In View</div>
            <div className='mt-2 text-3xl font-bold text-blue-400 flex items-center gap-2'>
              {inViewCount}
              <span className='relative flex h-3 w-3'>
                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75'></span>
                <span className='relative inline-flex rounded-full h-3 w-3 bg-blue-500'></span>
              </span>
            </div>
          </div>
          <div className='rounded-2xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-md'>
            <div className='text-xs font-semibold tracking-wider text-slate-500 uppercase'>Top Reached</div>
            <div className='mt-2 text-3xl font-bold text-indigo-400'>{model.topReachedCount}</div>
          </div>
          <div className='rounded-2xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-md'>
            <div className='text-xs font-semibold tracking-wider text-slate-500 uppercase'>Bottom Reached</div>
            <div className='mt-2 text-3xl font-bold text-emerald-400'>{model.bottomReachedCount}</div>
          </div>
        </div>

        {/* Main Work Area */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {/* Scroll container (Left 2 cols) */}
          <div className='lg:col-span-2 flex flex-col gap-4'>
            <div className='flex items-center justify-between border-b border-slate-800 pb-3'>
              <h2 className='text-lg font-bold text-slate-300'>Observed Scroll Feed</h2>
              <span className='text-xs text-slate-500'>Threshold: 50% visible</span>
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
                      ? 'bg-blue-600/10 border-blue-500/40 shadow-lg shadow-blue-500/5 text-blue-200 scale-[1.01]'
                      : 'bg-slate-900/40 border-slate-800/80 text-slate-400'
                  }`}
                >
                  <span className='text-sm font-semibold tracking-wide'>
                    Item {index}
                  </span>
                  <span className='text-xs mt-1 text-slate-500 font-mono'>
                    height: {item.height}px • {item.inView ? 'Active' : 'Idle'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Status Panel (Right 1 col) */}
          <div className='flex flex-col gap-4'>
            <div className='flex items-center justify-between border-b border-slate-800 pb-3'>
              <h2 className='text-lg font-bold text-slate-300'>Real-time Monitor</h2>
              <span className='text-xs text-slate-500 font-mono'>Status</span>
            </div>

            <div className='flex-1 rounded-2xl border border-slate-800 bg-slate-950/60 p-5 backdrop-blur-md flex flex-col gap-4 h-[600px] overflow-hidden'>
              <div className='text-xs font-bold tracking-wider text-slate-400 uppercase'>
                Virtual Map View
              </div>

              {/* Grid of indicators */}
              <div className='grid grid-cols-5 gap-2 overflow-y-auto pr-1 max-h-[480px] custom-scrollbar'>
                {model.items.map((item, index) => (
                  <div
                    key={`indicator-${item.id}`}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-200 ${
                      item.inView
                        ? 'bg-blue-500/20 border-blue-500/40 text-blue-300 font-bold'
                        : 'bg-slate-900/30 border-slate-900 text-slate-600'
                    }`}
                  >
                    <span className='text-[10px] font-mono'>{index}</span>
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
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-[10px] font-bold tracking-wider text-slate-500 uppercase'>
                    Console Feedback
                  </span>
                  <div className='flex gap-1'>
                    <span className='h-1.5 w-1.5 rounded-full bg-slate-700' />
                    <span className='h-1.5 w-1.5 rounded-full bg-slate-700' />
                    <span className='h-1.5 w-1.5 rounded-full bg-slate-700' />
                  </div>
                </div>
                <div className='rounded-lg bg-slate-900/80 p-3 font-mono text-[11px] text-emerald-400 leading-relaxed border border-slate-800/60'>
                  {model.topReachedCount > 0 && (
                    <div className='animate-pulse'>🍵 Top reached! ({model.topReachedCount})</div>
                  )}
                  {model.bottomReachedCount > 0 && (
                    <div className='animate-pulse'>🍵 Bottom reached! ({model.bottomReachedCount})</div>
                  )}
                  {model.topReachedCount === 0 && model.bottomReachedCount === 0 && (
                    <div className='text-slate-500 italic'>Scroll feed to trigger events...</div>
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
