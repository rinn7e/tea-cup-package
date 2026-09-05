import { PaginationMemo } from '@rinn7e/tea-cup-pagination/component'
import * as S from 'fp-ts/lib/string'
import {
  AlertCircle,
  Filter,
  Layers,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Zap,
} from 'lucide-react'
import React from 'react'
import { type Dispatcher } from 'tea-cup-fp'

import { ProductModal } from './component/product-modal'
import { mkPaginationConfig } from './helper'
import {
  CATEGORY_TABS,
  LIMIT_OPTIONS,
  type Model,
  type Msg,
  ProductEq,
  SORT_OPTIONS,
  isSortBy,
} from './type'

type Props = {
  model: Model
  dispatch: Dispatcher<Msg>
}

export const App: React.FC<Props> = ({ model, dispatch }) => {
  const paginationConfig = mkPaginationConfig(model, dispatch)

  return (
    <div
      id='product-scroll-container'
      className='min-h-screen bg-slate-50 text-slate-900 pb-20'
    >
      {/* Top Banner & Header */}
      <header className='border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40'>
        <div className='mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8'>
          <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
            {/* Title & Badge */}
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20'>
                <Layers className='h-5 w-5' />
              </div>
              <div>
                <div className='flex items-center gap-2'>
                  <h1 className='text-lg font-black tracking-tight text-slate-900 sm:text-xl'>
                    Tea-Cup Pagination
                  </h1>
                  <span className='rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-2xs font-bold text-indigo-700 uppercase tracking-wide'>
                    TEA Showcase
                  </span>
                </div>
                <p className='text-xs text-slate-500'>
                  Zero-flicker functional pagination with in-place item updates
                  and remote data state
                </p>
              </div>
            </div>

            {/* Simulation Controls Panel */}
            <div className='flex flex-wrap items-center gap-2.5'>
              {/* Latency Control */}
              <div className='flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs'>
                <Zap className='h-3.5 w-3.5 text-amber-500' />
                <span className='font-semibold text-slate-600'>Latency:</span>
                <select
                  data-test='latency-select'
                  aria-label='Simulate latency'
                  value={model.simulateLatencyMs}
                  onChange={(e) =>
                    dispatch({
                      _tag: 'SetSimulateLatency',
                      latencyMs: Number(e.target.value),
                    })
                  }
                  className='bg-transparent font-bold text-slate-900 focus:outline-hidden cursor-pointer'
                >
                  <option value={0}>0ms (Instant)</option>
                  <option value={250}>250ms</option>
                  <option value={600}>600ms</option>
                  <option value={1500}>1500ms (Slow)</option>
                </select>
              </div>

              {/* Error Toggle */}
              <button
                type='button'
                data-test='toggle-error-btn'
                onClick={() => dispatch({ _tag: 'ToggleSimulateError' })}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                  model.simulateError
                    ? 'border-rose-300 bg-rose-600 text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <AlertCircle className='h-3.5 w-3.5' />
                <span>
                  {model.simulateError ? 'Simulating Error' : 'Simulate Error'}
                </span>
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <nav
            data-test='category-tabs'
            aria-label='Product categories'
            className='mt-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none'
          >
            {CATEGORY_TABS.map((tab) => {
              const isActive = model.tab === tab.id
              const count =
                model.categoryCounts._tag === 'RemoteSuccess'
                  ? model.categoryCounts.value[tab.id]
                  : undefined

              return (
                <button
                  key={tab.id}
                  type='button'
                  data-test={`tab-${tab.id}`}
                  onClick={() => dispatch({ _tag: 'SetTab', tab: tab.id })}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'border border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>{tab.label}</span>
                  {count !== undefined && (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-2xs font-semibold ${
                        isActive
                          ? 'bg-slate-800 text-slate-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className='mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>
        {/* Filters Bar */}
        <section
          data-test='filters-bar'
          className='mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between'
        >
          {/* Search Field */}
          <div className='relative flex-1 max-w-md'>
            <Search className='absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
            <input
              type='text'
              data-test='search-input'
              value={model.searchQuery}
              onChange={(e) =>
                dispatch({
                  _tag: 'SetSearchQuery',
                  query: e.target.value,
                })
              }
              placeholder='Search products by title, description...'
              className='w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9.5 pr-4 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20'
            />
          </div>

          {/* Sort & Limit Selectors */}
          <div className='flex flex-wrap items-center gap-3'>
            {/* Sort Select */}
            <div className='flex items-center gap-1.5 text-xs text-slate-500'>
              <SlidersHorizontal className='h-3.5 w-3.5 text-slate-400' />
              <label htmlFor='sort-select' className='font-semibold'>
                Sort:
              </label>
              <select
                id='sort-select'
                data-test='sort-select'
                value={model.sortBy}
                onChange={(e) => {
                  const val = e.target.value
                  if (isSortBy(val)) {
                    dispatch({
                      _tag: 'SetSortBy',
                      sortBy: val,
                    })
                  }
                }}
                className='rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-hidden'
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Limit Select */}
            <div className='flex items-center gap-1.5 text-xs text-slate-500'>
              <Filter className='h-3.5 w-3.5 text-slate-400' />
              <label htmlFor='limit-select' className='font-semibold'>
                Show:
              </label>
              <select
                id='limit-select'
                data-test='limit-select'
                value={model.limit}
                onChange={(e) =>
                  dispatch({
                    _tag: 'SetLimit',
                    limit: Number(e.target.value),
                  })
                }
                className='rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-hidden'
              >
                {LIMIT_OPTIONS.map((lim) => (
                  <option key={lim} value={lim}>
                    {lim} per page
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters button */}
            {(model.searchQuery !== '' ||
              model.tab !== 'all' ||
              model.sortBy !== 'rating_desc') && (
              <button
                type='button'
                data-test='reset-filters-btn'
                onClick={() => dispatch({ _tag: 'ResetFilters' })}
                className='inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50'
              >
                <RotateCcw className='h-3.5 w-3.5' />
                <span>Reset</span>
              </button>
            )}
          </div>
        </section>

        {/* Pagination Container rendered by @rinn7e/tea-cup-pagination */}
        <section data-test='pagination-container'>
          <PaginationMemo
            model={model.pagination}
            config={paginationConfig}
            dispatch={(subMsg) => dispatch({ _tag: 'PaginationMsg', subMsg })}
            itemEq={ProductEq}
            errEq={S.Eq}
          />
        </section>
      </main>

      {/* Product Detail Modal Dialog */}
      <ProductModal
        product={model.selectedProduct}
        onClose={() => dispatch({ _tag: 'CloseModal' })}
        onToggleFavorite={() => {
          if (model.selectedProduct) {
            dispatch({
              _tag: 'PaginationMsg',
              subMsg: {
                _tag: 'ItemMsg',
                item: model.selectedProduct,
                msg: { _tag: 'ToggleFavorite' },
              },
            })
          }
        }}
      />
    </div>
  )
}
