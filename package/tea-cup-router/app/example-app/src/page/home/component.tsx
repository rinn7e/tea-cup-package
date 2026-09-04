import React from 'react'

import type { HomeTab } from '@/common/route'

import type { Props } from './type'

export const view = ({ model, dispatch }: Props) => {
  const changeTab = (tab: HomeTab) => {
    dispatch({ _tag: 'ChangeTab', tab })
  }

  const changePage = (page: number) => {
    dispatch({ _tag: 'ChangePage', page })
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <h1 className='text-2xl font-bold text-slate-800'>Home Page</h1>
          <p className='text-sm text-slate-500'>
            Demonstrates tab switching and pagination with `ChangeRouteNoReload`
            which preserves local page model state!
          </p>
        </div>

        {model.isFirstInitialized && (
          <div
            data-testid='first-initialized-indicator'
            className='flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-semibold shadow-sm animate-pulse transition-all duration-300'
          >
            <span className='inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping' />
            <span>✨ Fresh Page Initialized! (forceRefresh active)</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className='flex gap-2 border-b border-slate-200 pb-2'>
        <button
          type='button'
          data-testid='tab-global'
          onClick={() => changeTab('global')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            model.tab === 'global'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Global Feed
        </button>
        <button
          type='button'
          data-testid='tab-feed'
          onClick={() => changeTab('feed')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            model.tab === 'feed'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Your Feed (Auth Required)
        </button>
        <button
          type='button'
          data-testid='tab-tag'
          onClick={() => changeTab('tag')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            model.tab === 'tag'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          #react Tag
        </button>
      </div>

      {/* Interactive State Demo */}
      <div
        className={`p-4 bg-slate-50 border rounded-lg space-y-4 transition-all duration-500 ${
          model.isFirstInitialized
            ? 'border-emerald-500 ring-2 ring-emerald-300 shadow-md'
            : 'border-slate-200'
        }`}
      >
        <h3 className='text-sm font-semibold text-slate-700 uppercase tracking-wider'>
          Local Page Interactive State (Should Persist Across Tab Changes)
        </h3>

        <div className='flex items-center gap-4'>
          <span>
            Counter:{' '}
            <strong data-testid='home-counter' className='text-emerald-600'>
              {model.counter}
            </strong>
          </span>
          <button
            type='button'
            data-testid='btn-home-increment'
            onClick={() => dispatch({ _tag: 'Increment' })}
            className='px-3 py-1 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium'
          >
            Increment Counter
          </button>
          <button
            type='button'
            data-testid='btn-home-force-refresh'
            onClick={() => dispatch({ _tag: 'ForceRefreshViaChangeRoute' })}
            className='px-3 py-1 text-sm bg-rose-600 hover:bg-rose-700 text-white rounded font-medium'
          >
            Force Refresh via ChangeRoute (Reset State)
          </button>
        </div>

        <div>
          <label className='block text-xs font-semibold text-slate-600 mb-1'>
            Notes input:
          </label>
          <input
            type='text'
            data-testid='home-notes'
            value={model.notes}
            onChange={(e) =>
              dispatch({ _tag: 'ChangeNotes', notes: e.target.value })
            }
            placeholder='Type something here...'
            className='w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'
          />
        </div>
      </div>

      {/* TeaRouter Navigation Primitives Demo */}
      <div className='p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3'>
        <h3 className='text-sm font-semibold text-slate-700 uppercase tracking-wider'>
          TeaRouter Built-in Action Primitives Demo
        </h3>
        <div className='flex flex-wrap items-center gap-2'>
          <button
            type='button'
            data-testid='btn-modify-route-page'
            onClick={() => dispatch({ _tag: 'ModifyPageViaRouter' })}
            className='px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium shadow-sm transition-colors'
          >
            Modify Route (Next Page)
          </button>
          <button
            type='button'
            data-testid='btn-modify-route-no-reload-tab'
            onClick={() => dispatch({ _tag: 'ModifyTabNoReloadViaRouter' })}
            className='px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded font-medium shadow-sm transition-colors'
          >
            Modify Route NoReload (Toggle Tag)
          </button>
          <button
            type='button'
            data-testid='btn-modify-route-url-only'
            onClick={() => dispatch({ _tag: 'ModifyUrlNoReloadViaRouter' })}
            className='px-3 py-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded font-medium shadow-sm transition-colors'
          >
            Modify Route URL Only
          </button>
          <button
            type='button'
            data-testid='btn-router-refresh'
            onClick={() => dispatch({ _tag: 'RefreshViaRouter' })}
            className='px-3 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-700 text-white rounded font-medium shadow-sm transition-colors'
          >
            Router Refresh
          </button>
        </div>
      </div>

      {/* Pagination */}
      <div className='flex items-center gap-2'>
        <span className='text-xs font-semibold text-slate-500'>Pages:</span>
        {[1, 2, 3, 4].map((p) => (
          <button
            key={p}
            type='button'
            data-testid={`page-btn-${p}`}
            onClick={() => changePage(p)}
            className={`w-8 h-8 rounded text-xs font-bold ${
              model.page === p
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}
